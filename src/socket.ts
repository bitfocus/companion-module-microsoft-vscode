import { InstanceStatus } from "@companion-module/base";
import crypto from "crypto";
import { CONNECTING, RawData, WebSocket } from "ws";
import { Config } from "./config";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const SALT = "commandsocket-salt";

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export class Socket {
    private config: Config;
    private onMessage: (type: string, message: any) => void;
    private setStatus: (status: InstanceStatus) => void;
    private requests: string[];
    private requestPtr: number;
    private socket?: WebSocket;
    private reconnect?: NodeJS.Timeout;

    constructor(cfg: Config, onMsg: (type: string, message: any) => void, setStatus: (status: InstanceStatus) => void) {
        // Store password and message callback
        this.config = cfg;
        this.onMessage = onMsg;
        this.setStatus = setStatus;

        // Create request buffer
        this.requests = new Array<string>(100);
        this.requestPtr = 0;

        // Connect to server
        this.connect();

        // Start reconnect interval
        this.reconnect = setInterval(() => this.connect(), this.config.reconnect);
    }

    private async connect() {
        // If connected: Skip
        if (this.socket) return;

        try {
            // Create new socket
            this.socket = new WebSocket(`ws://${this.config.host}:${this.config.port}`);

            // Setup callbacks
            this.socket.on("error", () => {});
            this.socket.on("open", () => this.onOpen());
            this.socket.on("close", () => this.onClose());
            this.socket.on("message", (data) => this.onReceive(data));

            // Wait for socket to finish connecting
            while (this.socket.readyState === CONNECTING) await sleep(10);
        } catch (e) {
            // Connection failed: Delete socket, update status and retry
            delete this.socket;
            this.setStatus(InstanceStatus.ConnectionFailure);
        }
    }

    private async disconnect() {
        // Close socket
        this.socket?.close();

        // Wait for socket to vanish
        while (this.socket) await sleep(10);
    }

    private onOpen() {
        // Update instance status
        this.setStatus(InstanceStatus.Ok);
    }

    private onClose() {
        // Delete socket
        delete this.socket;

        // Update instance status
        this.setStatus(InstanceStatus.Disconnected);
    }

    private onReceive(raw: RawData) {
        try {
            // Read data
            let data = raw.toString();

            // Decrypt data if password is set
            if (this.config.password) {
                // Get encrypted data and IV
                const [encrypted, iv] = data.split("|");

                // Require IV
                if (!iv) return;

                // Crete key and decipher
                const key = crypto.scryptSync(this.config.password, SALT, 32);
                const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(iv, "hex"));

                // Decrypt data
                data = decipher.update(encrypted, "hex", "utf8");
            }

            // Parse JSON
            const message = JSON.parse(data);

            // Require response ID
            if (!("resID" in message)) return;

            // Get request type from response ID
            const type = this.requests[message.resID];

            // Run message callback
            this.onMessage(type, message);
        } catch (e) {}
    }

    send(action: string, payload: any = {}) {
        // Skip if socket is not connected
        if (!this.socket) return;

        // Construct message and register request
        const message = { ...payload, action, reqID: this.requestPtr };
        this.requests[this.requestPtr] = action;

        // Increment pointer
        this.requestPtr = (this.requestPtr + 1) % this.requests.length;

        // Serialize data
        let data = JSON.stringify(message);

        // Encrypt data if password is set
        if (this.config.password) {
            // Generate IV
            const iv = crypto.randomBytes(16);

            // Create key and cipher
            const key = crypto.scryptSync(this.config.password, SALT, 32);
            const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

            // Encrypt data
            data = [cipher.update(data, "utf8", "hex"), iv.toString("hex")].join("|");
        }

        // Send data
        this.socket.send(data);
    }

    async shutdown() {
        // Stop reconnection
        if (this.reconnect) {
            clearInterval(this.reconnect);
            delete this.reconnect;
        }

        // Disconnect
        await this.disconnect();
    }
}
