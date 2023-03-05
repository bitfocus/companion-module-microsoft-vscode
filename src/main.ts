import { InstanceBase, InstanceStatus, runEntrypoint, SomeCompanionConfigField } from "@companion-module/base";
import { Config, DefaultConfig, GetConfig } from "./config";
import { Socket } from "./socket";

export class ModuleInstance extends InstanceBase<Config> {
    private config: Config = DefaultConfig;
    private socket?: Socket;

    async init(config: Config, isFirstInit: boolean) {
        // Handle as config change
        await this.configUpdated(config);
    }

    async destroy() {
        await this.socket?.shutdown();
    }

    async configUpdated(config: Config) {
        // Set config
        this.config = config;

        // Restart socket
        await this.socket?.shutdown();
        this.socket = new Socket(
            this.config,
            (type: string, message: any) => {},
            (status: InstanceStatus) => this.updateStatus(status)
        );
    }

    getConfigFields(): SomeCompanionConfigField[] {
        return GetConfig();
    }
}

runEntrypoint(ModuleInstance, []);
