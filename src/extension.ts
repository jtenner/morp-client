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

    const writeEmitter = new vscode.EventEmitter<string>();

    let line = '';
    const pty = {
      onDidWrite: writeEmitter.event,
      open: () => writeEmitter.fire("Morp client (c) jtenner 2019\r\n"),
      handleInput: (data: string) => {
        if (data == "\r") {
          writeEmitter.fire(`\r\n> "${line}"\r\n\n`)
          line = "";
          return;
        }
        if (data === '\x7f') { // Backspace
          if (line.length === 0) {
            return;
          }
          line = line.substr(0, line.length - 1);
          // Move cursor backward
          writeEmitter.fire('\x1b[D');
          // Delete character
          writeEmitter.fire('\x1b[P');
          return;
        }
        line += data;
        writeEmitter.fire(data);
      }
    }

    const terminal = vscode.window.createTerminal({
      name: "Morp Client",
      // @ts-ignore
      pty,
    });
    terminal.show();

    socket.will(tn2.Options.BINARY_TRANSMISSION);
    socket.will(tn2.Options.GMCP)

    let loggedIn = false;
    socket.on("will", (option) => {
      if (option === tn2.Options.GMCP) {
        chan.append("GMCP Enabled\r\n");
        if (!loggedIn) {
          socket.gmcp("morp.login", {
            username: "admin",
            password: "admin",
          });
        }
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
          loggedIn = true;
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
