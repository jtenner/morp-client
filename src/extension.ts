// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as tn2 from "ts-telnet2";


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(ctx: vscode.ExtensionContext) {

	const chan = vscode.window.createOutputChannel("morp-output");

	let morpCmd = vscode.commands.registerCommand("morp-client:morp-connect", () => {
		const socket = tn2.createConnection(7070, "127.0.0.1");
		chan.show();
		socket.dont(tn2.Options.ECHO);
		socket.do(tn2.Options.BINARY_TRANSMISSION);
		socket.do(tn2.Options.GMCP).then(e => {
			chan.append("Doing GMCP");
		});

		socket.on("will", (option) => {
			if (option === tn2.Options.GMCP) {
				chan.append("GMCP Enabled\r\n");
				socket.gmcp("morp.login", {
					username: "admin",
					password: "admin",
				});
			}
		});

		socket.on("wont", (option) => {
			if (option === tn2.Options.GMCP) {
				chan.append("Disconnected\r\n");
				socket.end();
			}
		});

		socket.on("message", message => chan.append(message));
		// @ts-ignore
		socket.on("gmcp", (event: string, data: any) => {
			switch(event) {
				case "morp.logged-in": {
					chan.append("Logged in");
					break;
				}
			}
		});

		socket.on("will", (option) => {
			switch (option) {
				case tn2.Options.BINARY_TRANSMISSION:
				case tn2.Options.GMCP:
					socket.do(option, true);
					break;
				default:
					socket.dont(option, true);
			}
			// @ts-ignore
			let underlying: net.Socket = socket.socket;
			chan.append(`SOCKET WILL ${underlying.remoteAddress}:${underlying.remotePort} -> ${tn2.Options[option]}\r\n`);
		});
		socket.on("wont", (option) => {
			socket.dont(option, true);
			// @ts-ignore
			let underlying: net.Socket = socket.socket;
			chan.append(`SOCKET WONT ${underlying.remoteAddress}:${underlying.remotePort} -> ${tn2.Options[option]}\r\n`);
		});
		socket.on("do", (option) => {
			switch (option) {
				case tn2.Options.BINARY_TRANSMISSION:
				case tn2.Options.GMCP:
					socket.will(option, true);
					break;
				default:
					socket.wont(option, true);
			}
			// @ts-ignore
			let underlying: net.Socket = socket.socket;
			chan.append(`SOCKET DO ${underlying.remoteAddress}:${underlying.remotePort} -> ${tn2.Options[option]}\r\n`);
		});

		socket.on("dont", (option) => {
			socket.wont(option, true);
			// @ts-ignore
			let underlying: net.Socket = socket.socket;
			chan.append(`SOCKET DONT ${underlying.remoteAddress}:${underlying.remotePort} -> ${tn2.Options[option]}\r\n`);
		});

		socket.on("error", (error) => {
			chan.append(`Error ${error}`);
		});
	});

	ctx.subscriptions.push(morpCmd, chan);
}

// this method is called when your extension is deactivated
export function deactivate() {}
