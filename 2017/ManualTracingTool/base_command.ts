
namespace ManualTracingTool {

    export interface IEditCommand {

        isContinuing: boolean;
        isContinued: boolean;
        execute();
        undo();
        redo();
    }

    export class CommandBase implements IEditCommand {

        isContinuing = false;
        isContinued = false;

        execute() { // @override method

        }

        undo() { // @override method

        }

        redo() { // @override method

        }
    }

    export class CommandHistory {

        maxHistory = 300;

        historyList = new List<IEditCommand>();
        redoList = new List<IEditCommand>();

        addCommand(command: IEditCommand) {

            this.historyList.push(command);

            if (this.historyList.length > this.maxHistory) {

                ListRemoveAt(this.historyList, 0);
            }

            if (this.redoList.length > 0) {
                this.redoList = new List<IEditCommand>();
            }
        }

        private getLastCommand(): IEditCommand {

            if (this.historyList.length == 0) {
                return null;
            }

            return this.historyList[this.historyList.length - 1];
        }

        private getRedoCommand(): IEditCommand {

            if (this.redoList.length == 0) {
                return null;
            }

            return this.redoList[this.redoList.length - 1];
        }

        undo() {

            let command: IEditCommand = null;

            do {

                command = this.getLastCommand();

                if (command == null) {
                    return;
                }

                command.undo();

                this.redoList.push(command);
                ListRemoveAt(this.historyList, this.historyList.length - 1);
            }
            while (command.isContinued);
        }

        redo() {

            let command: IEditCommand = null;

            do {

                command = this.getRedoCommand();

                if (command == null) {
                    return;
                }

                command.redo();

                ListRemoveAt(this.redoList, this.redoList.length - 1);
                this.historyList.push(command);
            }
            while (command.isContinued);
        }
    }
}
