import { InstanceBase, InstanceStatus, runEntrypoint, SomeCompanionConfigField } from "@companion-module/base";
import { Config, DefaultConfig, GetConfig } from "./config";

export class ModuleInstance extends InstanceBase<Config> {
    private config: Config = DefaultConfig;

    async init(config: Config, isFirstInit: boolean) {
        // Handle as config change
        await this.configUpdated(config);
    }

    async destroy() {}

    async configUpdated(config: Config) {
        // Set config
        this.config = config;

        // Set status
        this.updateStatus(InstanceStatus.Ok);
    }

    getConfigFields(): SomeCompanionConfigField[] {
        return GetConfig();
    }
}

runEntrypoint(ModuleInstance, []);
