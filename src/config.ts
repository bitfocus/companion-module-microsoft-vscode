import { Regex, SomeCompanionConfigField } from "@companion-module/base";

export interface Config {
    host: string;
    port: number;
    password: string;
    reconnect: number;
    reloadCommands: number;
    reloadState: number;
}

export const DefaultConfig: Config = {
    host: "127.0.0.1",
    port: 6783,
    password: "",
    reconnect: 5000,
    reloadCommands: 60000,
    reloadState: 500,
};

export function GetConfig(): SomeCompanionConfigField[] {
    return [
        {
            id: "host",
            type: "textinput",
            label: "Target IP",
            width: 6,
            default: DefaultConfig.host,
            required: true,
            regex: Regex.IP,
        },
        {
            id: "port",
            type: "number",
            label: "Target port",
            width: 6,
            default: DefaultConfig.port,
            required: true,
            min: 0,
            max: 99999,
        },
        {
            id: "password",
            type: "textinput",
            label: "Password",
            width: 6,
            default: DefaultConfig.password,
            required: false,
        },
        {
            id: "reconnect",
            type: "number",
            label: "Reconnect delay (0 to disable)",
            width: 6,
            default: DefaultConfig.reconnect,
            required: true,
            min: 0,
            max: 60000,
        },
        {
            id: "reloadCommands",
            type: "number",
            label: "Fetch delay (commands)",
            width: 6,
            default: DefaultConfig.reloadCommands,
            required: true,
            min: 0,
            max: 3600000,
        },
        {
            id: "reloadState",
            type: "number",
            label: "Fetch delay (state)",
            width: 6,
            default: DefaultConfig.reloadState,
            required: true,
            min: 0,
            max: 60000,
        },
    ];
}
