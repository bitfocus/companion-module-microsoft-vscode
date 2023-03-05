import { InstanceBase, InstanceStatus, runEntrypoint, SomeCompanionConfigField } from "@companion-module/base";
import { Config, DefaultConfig, GetConfig } from "./config";
import { Socket } from "./socket";
import { GetVariables } from "./variables";

export class ModuleInstance extends InstanceBase<Config> {
    private config: Config = DefaultConfig;
    private socket?: Socket;
    private fetchState?: NodeJS.Timeout;

    async init(config: Config, isFirstInit: boolean) {
        // Set initial definitions
        this.setVariableDefinitions(GetVariables());

        // Handle as config change
        await this.configUpdated(config);
    }

    async destroy() {
        if (this.fetchState) clearInterval(this.fetchState);
        await this.socket?.shutdown();
    }

    async configUpdated(config: Config) {
        // Set config
        this.config = config;

        // Restart socket
        await this.socket?.shutdown();
        this.socket = new Socket(
            this.config,
            (type: string, message: any) => this.handleMessage(type, message),
            (status: InstanceStatus) => this.updateStatus(status)
        );

        // Restart fetch intervals
        this.restartFetchIntervals();
    }

    getConfigFields(): SomeCompanionConfigField[] {
        return GetConfig();
    }

    private restartFetchIntervals() {
        // Restart state fetching
        if (this.fetchState) {
            clearInterval(this.fetchState);
            delete this.fetchState;
        }

        this.fetchState = setInterval(() => {
            this.socket?.send("get-version");
            this.socket?.send("get-editor");
        }, this.config.reloadState);
    }

    private handleMessage(type: string, message: any) {
        if (type == "get-version") {
            this.setVariableValues({ version: message.version });
        } else if (type == "get-editor" && "editor" in message) {
            const editor = message.editor;
            this.setVariableValues({ language: editor.document.languageId, lines: editor.document.lineCount });
        }
    }
}

runEntrypoint(ModuleInstance, []);
