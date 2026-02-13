#!/bin/bash

echo "=================================="
echo "InnerVoiceAI Backend API Tests"
echo "=================================="

BASE_URL="http://localhost:8000/api"

echo ""
echo "✅ TEST 1: Health Check (GET /api/health/)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL/health/" | jq '.'

echo ""
echo "✅ TEST 2: Analyze Text (POST /api/analyze/)"
echo "--------------------------------------------"
curl -s -X POST "$BASE_URL/analyze/" \
  -H "Content-Type: application/json" \
  -d '{"text":"I am very happy and excited about this amazing project!"}' | jq '.'

echo ""
echo "✅ TEST 3: Get History (GET /api/history/)"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL/history/" | jq '.data | length as $count | {total_records: $count, first_record: .[0]}'

echo ""
echo "✅ TEST 4: Rewrite Text (POST /api/rewrite/)"
echo "---------------------------------------------"
curl -s -X POST "$BASE_URL/rewrite/" \
  -H "Content-Type: application/json" \
  -d '{"text":"I am sad and depressed","tone":"happy"}' | jq '.'

echo ""
echo "=================================="
echo "All tests completed!"
echo "=================================="
