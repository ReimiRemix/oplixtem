import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Client } from "ssh2";
import path from "path";
import { createServer as createViteServer } from "vite";
import net from "net";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  // Socket.IO logic for SSH backend
  io.on("connection", (socket) => {
    let sshClient: Client | null = null;
    let sshStream: any = null;
    const forwardServers: net.Server[] = [];

    socket.on("ssh-connect", (config) => {
      sshClient = new Client();
      sshClient.on("ready", () => {
        socket.emit("ssh-ready");
        sshClient!.shell({ term: "xterm-256color" }, (err, stream) => {
          if (err) {
            socket.emit("ssh-error", err.message);
            return;
          }
          sshStream = stream;
          socket.emit("ssh-shell-started");

          stream.on("close", () => {
             sshClient!.end();
             socket.emit("ssh-close");
          }).on("data", (data: any) => {
             socket.emit("ssh-data", data.toString("utf-8"));
          });
        });
      }).on("error", (err) => {
        socket.emit("ssh-error", err.message);
      }).connect({
        host: config.host,
        port: config.port ? parseInt(config.port, 10) : 22,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
      });
    });

    socket.on("ssh-forward-local", ({ localPort, targetHost, targetPort }) => {
      if (!sshClient) {
        socket.emit("ssh-error", "SSH Client not connected");
        return;
      }
      const server = net.createServer((c) => {
        sshClient!.forwardOut(
          '127.0.0.1', c.remotePort || 0,
          targetHost, targetPort,
          (err, stream) => {
            if (err) {
              c.end();
              return;
            }
            c.pipe(stream);
            stream.pipe(c);
          }
        );
      });
      
      server.listen(localPort, () => {
        socket.emit("ssh-forward-started", { type: 'local', localPort, targetHost, targetPort });
      });
      
      server.on('error', (err) => {
        socket.emit("ssh-error", `Local Forward error on port ${localPort}: ${err.message}`);
      });
      
      forwardServers.push(server);
    });

    socket.on("ssh-forward-remote", ({ remotePort, targetHost, targetPort }) => {
      if (!sshClient) {
        socket.emit("ssh-error", "SSH Client not connected");
        return;
      }
      
      socket.data.remoteForwardTargets = socket.data.remoteForwardTargets || {};
      socket.data.remoteForwardTargets[remotePort] = { targetHost, targetPort };

      sshClient.forwardIn('0.0.0.0', remotePort, (err) => {
        if (err) {
          socket.emit("ssh-error", `Remote Forward error on port ${remotePort}: ${err.message}`);
          return;
        }
        socket.emit("ssh-forward-started", { type: 'remote', localPort: remotePort, targetHost, targetPort });
      });
    });

    socket.on("ssh-sftp-upload", ({ filename, path, data }) => {
      if (!sshClient) return;
      sshClient.sftp((err, sftp) => {
        if (err) {
          socket.emit("ssh-error", "SFTP Error: " + err.message);
          return;
        }
        const writeStream = sftp.createWriteStream(path);
        writeStream.on('error', (e) => {
           socket.emit("ssh-error", "SFTP write error: " + e.message);
        });
        writeStream.on('close', () => {
           socket.emit("ssh-data", `\r\n\x1b[32m[SFTP] Uploaded ${filename} successfully.\x1b[0m\r\n`);
        });
        writeStream.write(Buffer.from(data));
        writeStream.end();
      });
    });

    if (sshClient) {
      sshClient.on('tcp connection', (details, accept, reject) => {
        const targetHost = socket.data.remoteForwardTargets?.[details.destPort]?.targetHost || '127.0.0.1';
        const targetPort = socket.data.remoteForwardTargets?.[details.destPort]?.targetPort || 80;
        
        const stream = accept();
        const client = net.connect(targetPort, targetHost, () => {
          stream.pipe(client);
          client.pipe(stream);
        });
        client.on('error', () => { stream.end(); });
      });
    }

    socket.on("ssh-data", (data) => {
      if (sshStream) {
        sshStream.write(data);
      }
    });

    socket.on("ssh-resize", ({ cols, rows }) => {
      if (sshStream && typeof sshStream.setWindow === 'function') {
        sshStream.setWindow(rows, cols, 0, 0);
      }
    });

    socket.on("disconnect", () => {
      forwardServers.forEach(s => s.close());
      if (sshClient) sshClient.end();
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
