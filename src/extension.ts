import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "custom-binary-editor" is now active!');

	vscode.window.registerCustomEditorProvider('custom-binary-editor', new CustomBinaryEditorProvider(), {});
}

export class CustomBinaryEditorProvider implements vscode.CustomEditorProvider {

	private mapDocumentToEditor: Map<vscode.CustomDocument, CustomBinaryEditor> = new Map();

	async resolveCustomDocument(document: vscode.CustomDocument): Promise<vscode.CustomEditorCapabilities> {
		return {
			editing: new CustomBinaryEditingCapabilities(document)
		};
	}

	async resolveCustomEditor(document: vscode.CustomDocument, panel: vscode.WebviewPanel): Promise<void> {
		let editor = this.mapDocumentToEditor.get(document);
		if (!editor) {
			editor = new CustomBinaryEditor(document, panel);
			this.mapDocumentToEditor.set(document, editor);

			panel.onDidDispose(() => {
				editor?.dispose();
				this.mapDocumentToEditor.delete(document);
			});
		}
	}
}

export class CustomBinaryEditingCapabilities implements vscode.CustomEditorEditingCapability<object> {

	constructor(private document: vscode.CustomDocument) { }

	save(): Thenable<void> {
		throw new Error("Method not implemented.");
	}

	saveAs(targetResource: vscode.Uri): Thenable<void> {
		throw new Error("Method not implemented.");
	}

	onDidEdit: vscode.Event<object> = new vscode.EventEmitter<object>().event;

	applyEdits(edits: readonly object[]): Thenable<void> {
		throw new Error("Method not implemented.");
	}

	undoEdits(edits: readonly object[]): Thenable<void> {
		throw new Error("Method not implemented.");
	}

	backup(cancellation: vscode.CancellationToken): Thenable<boolean> {
		throw new Error("Method not implemented.");
	}
}

export class CustomBinaryEditor {

	private disposables: vscode.Disposable[] = [];

	constructor(private document: vscode.CustomDocument, private panel: vscode.WebviewPanel) {
		panel.webview.options = { enableScripts: true };

		panel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'webview->exthost:ready':
					// this.whenEditorReady(document, panel);
					break;
				case 'webview->exthost:changeContent':
					// this.changeContent(e.payload);
					break;
			}
		});

		panel.webview.html = this.getEditorHtml(panel);
	}


	private getEditorHtml(panel: vscode.WebviewPanel): string {
		return `
		<html>
			<head>
				<script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(__dirname, '..', 'static', 'editor.js')))}"></script>
			</head>
		</html>`;
	}

	dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}

		this.disposables = [];
	}
}