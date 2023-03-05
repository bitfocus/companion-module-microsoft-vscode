import { CompanionActionDefinitions, DropdownChoice } from "@companion-module/base";

export class Actions {
    private setActions: (actions: CompanionActionDefinitions) => void;
    private send: (action: string, payload: any) => void;
    private groupedCommands: Map<string, DropdownChoice[]> = new Map();
    private commandsString: string = "";

    constructor(setActions: (actions: CompanionActionDefinitions) => void, send: (a: string, p: any) => void) {
        this.setActions = setActions;
        this.send = send;
    }

    setCommands(commands: string[]) {
        // Only update when command list changed
        const str = JSON.stringify(commands);
        if (str == this.commandsString) return;
        this.commandsString = str;

        // Clear commands
        this.groupedCommands.clear();

        // Fill commands
        for (const command of commands) {
            // Get key from command
            const period = command.indexOf(".");
            const key = period === -1 ? "default" : command.substring(0, period);

            // Make sure array exists
            if (!this.groupedCommands.has(key)) this.groupedCommands.set(key, []);

            // Add command to array
            const name = command.substring(period + 1);
            this.groupedCommands.get(key)?.push({ id: name, label: name });
        }

        // Regenerate actions
        this.setActions({ ...this.getOtherActions(), ...this.getCommandActions() });
    }

    getCommandActions(): CompanionActionDefinitions {
        // Create actions
        let actions: CompanionActionDefinitions = {};

        // Fill actions
        for (const group of this.groupedCommands.keys()) {
            const groupPrefix = group === "default" ? "" : group + ".";

            actions["run_command_" + group] = {
                name: `Run ${group} command`,
                options: [
                    {
                        id: "command",
                        type: "dropdown",
                        label: "Command",
                        choices: this.groupedCommands.get(group)!,
                        default: this.groupedCommands.get(group)![0].id,
                    },
                ],
                callback: (action) =>
                    this.send("run-command", {
                        command: groupPrefix + action.options.command?.toString() ?? "noop",
                    }),
            };
        }

        // Return actions
        return actions;
    }

    getOtherActions(): CompanionActionDefinitions {
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
        };
    }
}
