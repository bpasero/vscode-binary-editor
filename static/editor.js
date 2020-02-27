
(function () {
    const vscode = acquireVsCodeApi();

    vscode.postMessage({ type: 'webview->exthost:ready' });

    let editor;
    let ignoreChange = false;

    window.addEventListener('message', e => {
        switch (e.data.type) {
            case 'exhost->webview:init':
                break;
            case 'exhost->webview:updateContent':
                break;
        }
    });
})();
