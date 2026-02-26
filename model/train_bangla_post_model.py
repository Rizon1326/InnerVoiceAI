"""
========================================================================
InnerVoiceAI — Multi-Task Model Training Script
========================================================================
Trains three classification heads on Bangla/English/Banglish Facebook
posts using a shared multilingual transformer backbone:

    1. Sentiment   → positive / negative / neutral
    2. Emotion     → joy / sadness / anger / fear / surprise / neutral
    3. Personality → Openness / Conscientiousness / Extraversion /
                     Agreeableness / Neuroticism

Dataset : bangla_posts_labeled_1500.xlsx  (≥ 1500 rows)
Backbone: xlm-roberta-base  (multilingual; handles Bangla natively)

Outputs saved to  ./trained_models/<task>/
========================================================================
Requirements (install before running):
    pip install torch transformers datasets openpyxl pandas scikit-learn
    pip install accelerate evaluate seqeval
========================================================================
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

import torch
from torch.utils.data import Dataset, DataLoader
from torch import nn

from transformers import (
    AutoTokenizer,
    AutoModel,
    get_linear_schedule_with_warmup,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score,
)

warnings.filterwarnings("ignore")

# ======================================================================
# 0. CONFIGURATION
# ======================================================================

class Config:
    """Central configuration — tweak hyper-parameters here."""

    # Paths
    DATASET_PATH = os.path.join(os.path.dirname(__file__),
                                "bangla_posts_labeled_1500.xlsx")
    OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), "trained_models")

    # Backbone
    MODEL_NAME   = "xlm-roberta-base"   # multilingual; handles bn, en
    MAX_LENGTH   = 128                  # token limit per post

    # Training
    EPOCHS       = 10
    BATCH_SIZE   = 16
    LEARNING_RATE = 2e-5
    WEIGHT_DECAY  = 0.01
    WARMUP_RATIO  = 0.1
    DROPOUT       = 0.3

    # Splits
    TEST_SIZE    = 0.15
    VAL_SIZE     = 0.15    # fraction of the remaining train set
    RANDOM_STATE = 42

    # Tasks — each will get its own classification head
    TASKS = {
        "sentiment":   {"column": "Sentiment",   "num_classes": 3},
        "emotion":     {"column": "Emotion",     "num_classes": 6},
        "personality": {"column": "Personality", "num_classes": 5},
    }

    # Device
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ======================================================================
# 1. DATA LOADING & PREPROCESSING
# ======================================================================

def load_dataset(path: str) -> pd.DataFrame:
    """Load the labelled XLSX and do basic cleaning."""
    print(f"📂 Loading dataset from: {path}")
    df = pd.read_excel(path)

    # Normalise column names
    df.columns = [c.strip() for c in df.columns]

    # Drop rows without a post
    df = df.dropna(subset=["Post"])
    df["Post"] = df["Post"].astype(str).str.strip()
    df = df[df["Post"].str.len() > 0].reset_index(drop=True)

    print(f"   ✅ Loaded {len(df)} rows")
    print(f"   📊 Columns: {list(df.columns)}")
    print()

    # Print class distributions
    for task_name, task_cfg in Config.TASKS.items():
        col = task_cfg["column"]
        if col in df.columns:
            print(f"   [{task_name.upper()}] distribution:")
            dist = df[col].value_counts()
            for label, count in dist.items():
                print(f"      {label:25s} → {count:>5d}  ({count/len(df)*100:.1f}%)")
            print()

    return df


class PostDataset(Dataset):
    """PyTorch dataset that tokenises posts and returns label tensors
    for every task (sentiment, emotion, personality)."""

    def __init__(self, texts, label_dict, tokenizer, max_length):
        """
        Args:
            texts       : list[str]
            label_dict  : dict[task_name → np.ndarray of int labels]
            tokenizer   : HuggingFace tokenizer
            max_length  : int
        """
        self.texts = texts
        self.label_dict = label_dict
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        item = {
            "input_ids":      encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
        }
        for task_name, labels in self.label_dict.items():
            item[f"label_{task_name}"] = torch.tensor(labels[idx], dtype=torch.long)
        return item


def prepare_data(df: pd.DataFrame, tokenizer):
    """Encode labels, split into train/val/test, return DataLoaders."""
    label_encoders = {}
    encoded_labels = {}

    for task_name, task_cfg in Config.TASKS.items():
        col = task_cfg["column"]
        le = LabelEncoder()
        encoded = le.fit_transform(df[col].values)
        label_encoders[task_name] = le
        encoded_labels[task_name] = encoded
        print(f"   🏷️  [{task_name}] classes: {list(le.classes_)}")

    texts = df["Post"].tolist()

    # --- Train / Test split ---
    idx = np.arange(len(texts))
    train_idx, test_idx = train_test_split(
        idx, test_size=Config.TEST_SIZE,
        random_state=Config.RANDOM_STATE,
        stratify=encoded_labels["sentiment"],   # stratify on sentiment
    )

    # --- Train / Val split ---
    train_idx, val_idx = train_test_split(
        train_idx, test_size=Config.VAL_SIZE,
        random_state=Config.RANDOM_STATE,
        stratify=encoded_labels["sentiment"][train_idx],
    )

    def _make_loader(indices, shuffle):
        t = [texts[i] for i in indices]
        ld = {k: v[indices] for k, v in encoded_labels.items()}
        ds = PostDataset(t, ld, tokenizer, Config.MAX_LENGTH)
        return DataLoader(ds, batch_size=Config.BATCH_SIZE,
                          shuffle=shuffle, num_workers=0)

    train_loader = _make_loader(train_idx, shuffle=True)
    val_loader   = _make_loader(val_idx,   shuffle=False)
    test_loader  = _make_loader(test_idx,  shuffle=False)

    print(f"\n   📦 Split sizes — train: {len(train_idx)}, "
          f"val: {len(val_idx)}, test: {len(test_idx)}")

    return train_loader, val_loader, test_loader, label_encoders


# ======================================================================
# 2. MODEL DEFINITION — Multi-Task Classifier
# ======================================================================

class MultiTaskClassifier(nn.Module):
    """
    Shared XLM-RoBERTa backbone with three independent classification
    heads — one per task (sentiment, emotion, personality).

    Architecture:
        [XLM-RoBERTa] → [CLS] pooling
                       ├─→ Sentiment  head (3 classes)
                       ├─→ Emotion    head (6 classes)
                       └─→ Personality head (5 classes)
    """

    def __init__(self, model_name: str, task_num_classes: dict, dropout: float):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(model_name)
        hidden_size = self.backbone.config.hidden_size   # 768 for base

        self.dropout = nn.Dropout(dropout)

        # One classification head per task
        self.heads = nn.ModuleDict()
        for task_name, num_cls in task_num_classes.items():
            self.heads[task_name] = nn.Sequential(
                nn.Linear(hidden_size, 256),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(256, num_cls),
            )

    def forward(self, input_ids, attention_mask):
        outputs = self.backbone(
            input_ids=input_ids,
            attention_mask=attention_mask,
        )
        # Use [CLS] token representation
        cls_output = outputs.last_hidden_state[:, 0, :]
        cls_output = self.dropout(cls_output)

        logits = {}
        for task_name, head in self.heads.items():
            logits[task_name] = head(cls_output)

        return logits


# ======================================================================
# 3. TRAINING LOOP
# ======================================================================

def compute_class_weights(loader, task_name, num_classes, device):
    """Compute inverse-frequency class weights for imbalanced classes."""
    counts = torch.zeros(num_classes)
    for batch in loader:
        labels = batch[f"label_{task_name}"]
        for c in range(num_classes):
            counts[c] += (labels == c).sum().item()
    weights = 1.0 / (counts + 1e-6)
    weights = weights / weights.sum() * num_classes   # normalise
    return weights.to(device)


def train_one_epoch(model, loader, optimizer, scheduler, criteria, device):
    """Run one training epoch; return average loss."""
    model.train()
    total_loss = 0.0

    for batch in loader:
        input_ids      = batch["input_ids"].to(device)
        attention_mask  = batch["attention_mask"].to(device)

        optimizer.zero_grad()
        logits = model(input_ids, attention_mask)

        loss = torch.tensor(0.0, device=device)
        for task_name, criterion in criteria.items():
            labels = batch[f"label_{task_name}"].to(device)
            task_loss = criterion(logits[task_name], labels)
            loss = loss + task_loss

        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        scheduler.step()

        total_loss += loss.item()

    return total_loss / len(loader)


@torch.no_grad()
def evaluate(model, loader, criteria, device):
    """Evaluate on val/test set; return avg loss & per-task predictions."""
    model.eval()
    total_loss = 0.0
    all_preds = {t: [] for t in Config.TASKS}
    all_labels = {t: [] for t in Config.TASKS}

    for batch in loader:
        input_ids      = batch["input_ids"].to(device)
        attention_mask  = batch["attention_mask"].to(device)

        logits = model(input_ids, attention_mask)

        loss = torch.tensor(0.0, device=device)
        for task_name, criterion in criteria.items():
            labels = batch[f"label_{task_name}"].to(device)
            loss = loss + criterion(logits[task_name], labels)

            preds = logits[task_name].argmax(dim=-1).cpu().numpy()
            all_preds[task_name].extend(preds)
            all_labels[task_name].extend(labels.cpu().numpy())

        total_loss += loss.item()

    avg_loss = total_loss / len(loader)
    return avg_loss, all_preds, all_labels


# ======================================================================
# 4. MAIN TRAINING PIPELINE
# ======================================================================

def main():
    print("=" * 70)
    print("  InnerVoiceAI — Multi-Task Model Training")
    print(f"  Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Device: {Config.DEVICE}")
    print("=" * 70)
    print()

    # ── 4.1  Load data ────────────────────────────────────────────────
    df = load_dataset(Config.DATASET_PATH)

    # ── 4.2  Tokenizer ────────────────────────────────────────────────
    print(f"🔤 Loading tokenizer: {Config.MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(Config.MODEL_NAME)

    # ── 4.3  Data loaders ─────────────────────────────────────────────
    print("\n⚙️  Preparing data splits …")
    train_loader, val_loader, test_loader, label_encoders = prepare_data(
        df, tokenizer
    )

    # ── 4.4  Model ────────────────────────────────────────────────────
    task_num_classes = {
        t: cfg["num_classes"] for t, cfg in Config.TASKS.items()
    }
    print(f"\n🏗️  Building MultiTaskClassifier …")
    print(f"   Backbone : {Config.MODEL_NAME}")
    print(f"   Heads    : {task_num_classes}")
    model = MultiTaskClassifier(
        Config.MODEL_NAME, task_num_classes, Config.DROPOUT
    ).to(Config.DEVICE)

    total_params = sum(p.numel() for p in model.parameters())
    trainable    = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"   Total params    : {total_params:,}")
    print(f"   Trainable params: {trainable:,}")

    # ── 4.5  Loss functions (class-weighted) ──────────────────────────
    print("\n⚖️  Computing class weights …")
    criteria = {}
    for task_name, task_cfg in Config.TASKS.items():
        weights = compute_class_weights(
            train_loader, task_name,
            task_cfg["num_classes"], Config.DEVICE
        )
        criteria[task_name] = nn.CrossEntropyLoss(weight=weights)
        print(f"   [{task_name}] weights: "
              f"{[f'{w:.3f}' for w in weights.cpu().tolist()]}")

    # ── 4.6  Optimizer & scheduler ────────────────────────────────────
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=Config.LEARNING_RATE,
        weight_decay=Config.WEIGHT_DECAY,
    )
    total_steps = len(train_loader) * Config.EPOCHS
    warmup_steps = int(total_steps * Config.WARMUP_RATIO)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps,
    )
    print(f"\n📈 Optimizer : AdamW (lr={Config.LEARNING_RATE})")
    print(f"   Scheduler: linear warmup ({warmup_steps} steps) + decay")
    print(f"   Total steps: {total_steps}")

    # ── 4.7  Training loop ────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  🚀 TRAINING STARTED")
    print("=" * 70)

    best_val_f1 = 0.0
    best_epoch = 0
    history = {"train_loss": [], "val_loss": [], "val_f1": {}}

    for epoch in range(1, Config.EPOCHS + 1):
        # Train
        train_loss = train_one_epoch(
            model, train_loader, optimizer, scheduler, criteria, Config.DEVICE
        )

        # Validate
        val_loss, val_preds, val_labels = evaluate(
            model, val_loader, criteria, Config.DEVICE
        )

        # Per-task F1
        epoch_f1s = {}
        for task_name in Config.TASKS:
            f1 = f1_score(
                val_labels[task_name], val_preds[task_name],
                average="weighted",
            )
            epoch_f1s[task_name] = f1

        avg_f1 = np.mean(list(epoch_f1s.values()))

        # Logging
        f1_str = " | ".join(
            f"{t}: {f:.3f}" for t, f in epoch_f1s.items()
        )
        print(
            f"  Epoch {epoch:02d}/{Config.EPOCHS} │ "
            f"train_loss: {train_loss:.4f} │ "
            f"val_loss: {val_loss:.4f} │ "
            f"avg_F1: {avg_f1:.4f} │ {f1_str}"
        )

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        for t in epoch_f1s:
            history["val_f1"].setdefault(t, []).append(epoch_f1s[t])

        # Save best model
        if avg_f1 > best_val_f1:
            best_val_f1 = avg_f1
            best_epoch = epoch
            _save_checkpoint(model, tokenizer, label_encoders, epoch, avg_f1)
            print(f"        ↑ New best model saved (F1={avg_f1:.4f})")

    print("\n" + "=" * 70)
    print(f"  ✅ TRAINING COMPLETE — best epoch: {best_epoch}, "
          f"best avg F1: {best_val_f1:.4f}")
    print("=" * 70)

    # ── 4.8  Final evaluation on TEST set ─────────────────────────────
    print("\n📊 Evaluating on TEST set …\n")

    # Reload best checkpoint
    ckpt_path = os.path.join(Config.OUTPUT_DIR, "best_model", "model.pt")
    model.load_state_dict(torch.load(ckpt_path, map_location=Config.DEVICE))

    test_loss, test_preds, test_labels = evaluate(
        model, test_loader, criteria, Config.DEVICE
    )

    for task_name in Config.TASKS:
        le = label_encoders[task_name]
        y_true = le.inverse_transform(test_labels[task_name])
        y_pred = le.inverse_transform(test_preds[task_name])

        print(f"\n{'─' * 50}")
        print(f"  📋 {task_name.upper()} — Classification Report")
        print(f"{'─' * 50}")
        print(classification_report(y_true, y_pred, digits=4))

        acc = accuracy_score(y_true, y_pred)
        f1  = f1_score(
            test_labels[task_name], test_preds[task_name],
            average="weighted",
        )
        print(f"  Accuracy : {acc:.4f}")
        print(f"  Weighted F1: {f1:.4f}")

        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred, labels=le.classes_)
        print(f"\n  Confusion Matrix:")
        header = "".join(f"{c:>12s}" for c in le.classes_)
        print(f"{'':>18s}{header}")
        for i, row in enumerate(cm):
            row_str = "".join(f"{v:>12d}" for v in row)
            print(f"  {le.classes_[i]:>16s}{row_str}")
        print()

    # ── 4.9  Save training history ────────────────────────────────────
    history_path = os.path.join(Config.OUTPUT_DIR, "training_history.json")
    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)
    print(f"📜 Training history saved to: {history_path}")

    # ── 4.10  Save label mappings ─────────────────────────────────────
    mappings = {}
    for task_name, le in label_encoders.items():
        mappings[task_name] = {
            "classes": list(le.classes_),
            "id2label": {int(i): c for i, c in enumerate(le.classes_)},
            "label2id": {c: int(i) for i, c in enumerate(le.classes_)},
        }
    mappings_path = os.path.join(Config.OUTPUT_DIR, "label_mappings.json")
    with open(mappings_path, "w") as f:
        json.dump(mappings, f, indent=2, ensure_ascii=False)
    print(f"🏷️  Label mappings saved to: {mappings_path}")

    print("\n🎉 All done! Models and artifacts are in:", Config.OUTPUT_DIR)


# ======================================================================
# 5. CHECKPOINT UTILITIES
# ======================================================================

def _save_checkpoint(model, tokenizer, label_encoders, epoch, f1):
    """Save model weights, tokenizer, and label encoders."""
    save_dir = os.path.join(Config.OUTPUT_DIR, "best_model")
    os.makedirs(save_dir, exist_ok=True)

    # Save model state dict
    torch.save(model.state_dict(), os.path.join(save_dir, "model.pt"))

    # Save tokenizer (for inference later)
    tokenizer.save_pretrained(save_dir)

    # Save config for reproducibility
    config_dict = {
        "model_name": Config.MODEL_NAME,
        "max_length": Config.MAX_LENGTH,
        "tasks": {
            t: {
                "num_classes": cfg["num_classes"],
                "classes": list(label_encoders[t].classes_),
            }
            for t, cfg in Config.TASKS.items()
        },
        "epoch": epoch,
        "best_f1": float(f1),
        "dropout": Config.DROPOUT,
        "saved_at": datetime.now().isoformat(),
    }
    with open(os.path.join(save_dir, "config.json"), "w") as f:
        json.dump(config_dict, f, indent=2, ensure_ascii=False)


# ======================================================================
# 6. INFERENCE UTILITY  (use after training)
# ======================================================================

class InnerVoicePredictor:
    """
    Load the trained multi-task model and predict sentiment, emotion,
    and personality from a single text input.

    Usage:
        predictor = InnerVoicePredictor("./trained_models/best_model")
        result = predictor.predict("আজকে মনটা খুব ভালো লাগছে!")
        print(result)
        # {
        #   "sentiment":   {"label": "positive", "confidence": 0.92},
        #   "emotion":     {"label": "joy",      "confidence": 0.87},
        #   "personality": {"label": "Openness", "confidence": 0.74},
        # }
    """

    def __init__(self, model_dir: str):
        self.device = Config.DEVICE

        # Load config
        with open(os.path.join(model_dir, "config.json")) as f:
            self.config = json.load(f)

        # Tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)

        # Model
        task_num_classes = {
            t: info["num_classes"]
            for t, info in self.config["tasks"].items()
        }
        self.model = MultiTaskClassifier(
            self.config["model_name"],
            task_num_classes,
            self.config.get("dropout", 0.3),
        ).to(self.device)

        state = torch.load(
            os.path.join(model_dir, "model.pt"),
            map_location=self.device,
        )
        self.model.load_state_dict(state)
        self.model.eval()

        # Label maps
        self.id2label = {
            t: {int(k): v for k, v in info["id2label"].items()}
            for t, info in self._load_label_mappings(model_dir).items()
        }

    @staticmethod
    def _load_label_mappings(model_dir):
        path = os.path.join(os.path.dirname(model_dir), "label_mappings.json")
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
        # Fallback: use config
        cfg_path = os.path.join(model_dir, "config.json")
        with open(cfg_path) as f:
            cfg = json.load(f)
        mappings = {}
        for t, info in cfg["tasks"].items():
            mappings[t] = {
                "id2label": {i: c for i, c in enumerate(info["classes"])}
            }
        return mappings

    @torch.no_grad()
    def predict(self, text: str) -> dict:
        encoding = self.tokenizer(
            text,
            max_length=self.config["max_length"],
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        input_ids = encoding["input_ids"].to(self.device)
        attention_mask = encoding["attention_mask"].to(self.device)

        logits = self.model(input_ids, attention_mask)

        results = {}
        for task_name, task_logits in logits.items():
            probs = torch.softmax(task_logits, dim=-1).squeeze(0)
            pred_id = probs.argmax().item()
            confidence = probs[pred_id].item()
            label = self.id2label[task_name][pred_id]

            # Also include all class probabilities
            all_probs = {
                self.id2label[task_name][i]: round(p.item(), 4)
                for i, p in enumerate(probs)
            }
            results[task_name] = {
                "label": label,
                "confidence": round(confidence, 4),
                "scores": all_probs,
            }

        return results

    def predict_batch(self, texts: list[str]) -> list[dict]:
        """Predict on a list of texts."""
        return [self.predict(t) for t in texts]


# ======================================================================
# ENTRY POINT
# ======================================================================

if __name__ == "__main__":
    main()
