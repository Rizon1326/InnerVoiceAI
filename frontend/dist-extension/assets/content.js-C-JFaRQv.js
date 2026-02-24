(function(){chrome.runtime.onMessage.addListener((e,r,t)=>{if(e.action==="getSelectedText"){const n=window.getSelection()?.toString()?.trim()||"";t({text:n})}return!0});
})()
