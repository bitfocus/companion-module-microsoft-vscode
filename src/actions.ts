import { CompanionActionDefinitions } from "@companion-module/base";

export class Actions {
    private setActions: (actions: CompanionActionDefinitions) => void;
    private send: (action: string, payload: any) => void;
    private commands: string[] = [];

    constructor(setActions: (actions: CompanionActionDefinitions) => void, send: (a: string, p: any) => void) {
        this.setActions = setActions;
        this.send = send;
    }

    setCommands(commands: string[]) {
        // Only update when command list changed
        if (JSON.stringify(commands) == JSON.stringify(this.commands)) return;

        // Set commands
        this.commands = commands;

        // Regenerate actions
        this.setActions({ ...this.getActions() });
    }

    getActions(): CompanionActionDefinitions {
        const commands = this.commands.map((command) => ({ id: command, label: command }));

        return {
            alert: {
                name: "Send notification",
                options: [
                    { id: "message", type: "textinput", label: "Message" },
                    {
                        id: "level",
                        type: "dropdown",
                        label: "Level",
                        choices: [
                            { id: "info", label: "Information" },
                            { id: "warn", label: "Warning" },
                            { id: "error", label: "Error" },
                        ],
                        default: "info",
                    },
                ],
                callback: (action) =>
                    this.send("alert", {
                        message: action.options.message?.toString(),
                        level: action.options.level?.toString(),
                    }),
            },
            status: {
                name: "Show status",
                options: [
                    { id: "message", type: "textinput", label: "Message" },
                    { id: "timeout", type: "number", label: "Timeout (ms)", min: 0, max: 60000, default: 5000 },
                ],
                callback: (action) =>
                    this.send("status", {
                        message: action.options.message?.toString(),
                        timeout: Number.parseInt(action.options.timeout!.toString()),
                    }),
            },
            command: {
                name: "Run command",
                options: [{ id: "command", type: "dropdown", label: "Command", choices: commands, default: "noop" }],
                callback: (action) =>
                    this.send("run-command", { command: action.options.command?.toString() ?? "noop" }),
            },
        };
    }
}
