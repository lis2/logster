import classic from "ember-classic-decorator";
import { debounce } from "@ember/runloop";
import { action, computed } from "@ember/object";
import Controller from "@ember/controller";
import {
  ajax,
  getLocalStorage,
  setLocalStorage,
} from "client-app/lib/utilities";
import Preload from "client-app/lib/preload";
import { tracked } from "@glimmer/tracking";

@classic
export default class IndexController extends Controller {
  @tracked loading = false;
  @tracked buildingGroupingPattern = false;
  @tracked rowMessagesForGroupingPattern = [];

  showDebug = getLocalStorage("showDebug", false);
  showInfo = getLocalStorage("showInfo", false);
  showWarn = getLocalStorage("showWarn", true);
  showErr = getLocalStorage("showErr", true);
  showFatal = getLocalStorage("showFatal", true);
  search = null;
  queryParams = ["search"];

  @computed
  get showSettings() {
    return Preload.get("patterns_enabled");
  }

  get actionsInMenu() {
    return (
      /mobile/i.test(navigator.userAgent) && !/iPad/.test(navigator.userAgent)
    );
  }

  get showCreateGroupingPattern() {
    return (
      this.buildingGroupingPattern &&
      this.rowMessagesForGroupingPattern.length > 1
    );
  }

  @computed("search")
  get searchTerm() {
    if (this.search) {
      this.doSearch(this.search);
      return this.search;
    }
    return null;
  }

  async doSearch(term) {
    this.model.set("search", term);
    this.loading = true;
    await this.model.reload();
    this.loading = false;
    this.model.updateSelectedRow();
  }

  resizePanels(amount) {
    const bottomPanel = document.getElementById("bottom-panel");
    const topPanel = document.getElementById("top-panel");
    bottomPanel.style.height = `${amount - 13}px`;
    topPanel.style.bottom = `${amount + 12}px`;
  }

  @action
  expandMessage(message) {
    message.expand();
  }

  @action
  selectRowAction(row, opts = {}) {
    this.model.selectRow(row, opts);
  }

  @action
  handleCheckboxChange(row, event) {
    if (event.target.checked) {
      this.rowMessagesForGroupingPattern = [
        ...this.rowMessagesForGroupingPattern,
        row.message,
      ];
    } else {
      this.rowMessagesForGroupingPattern =
        this.rowMessagesForGroupingPattern.filter((i) => i !== row.message);
    }
  }

  @action
  tabChangedAction(newTab) {
    this.model.tabChanged(newTab);
  }

  @action
  showMoreBefore() {
    this.model.showMoreBefore();
  }

  @action
  loadMore() {
    return this.model.loadMore();
  }

  @action
  async clear() {
    // eslint-disable-next-line no-alert
    if (confirm("Clear the logs?\n\nCancel = No, OK = Clear")) {
      await ajax("/clear", { type: "POST" });
      this.model.reload();
      this.loading = false;
    }
  }

  @action
  removeMessage(msg) {
    const group = this.model.currentRow.group ? this.model.currentRow : null;
    const rows = this.model.rows;
    const idx = group ? rows.indexOf(group) : rows.indexOf(msg);

    msg.destroy();
    msg.set("selected", false);
    this.model.set("total", this.model.total - 1);
    let removedRow = false;
    let messageIndex = 0;

    if (group) {
      messageIndex = group.messages.indexOf(msg);
      group.messages.removeObject(msg);
      messageIndex = Math.min(messageIndex, group.messages.length - 1);
      if (group.messages.length === 0) {
        rows.removeObject(group);
        removedRow = true;
      }
    } else {
      rows.removeObject(msg);
      removedRow = true;
    }

    if (removedRow) {
      if (idx > 0) {
        this.model.selectRow(rows[idx - 1]);
      } else if (this.model.total > 0) {
        this.model.selectRow(rows[0]);
      } else {
        this.model.reload();
      }
    } else if (group) {
      this.model.selectRow(rows[idx], { messageIndex });
    }
  }

  @action
  solveMessage(msg) {
    this.model.solve(msg);
  }

  @action
  groupedMessageChangedAction(newPosition) {
    this.model.groupedMessageChanged(newPosition);
  }

  @action
  envChangedAction(newPosition) {
    this.model.envChanged(newPosition);
  }

  @action
  async updateFilter(name) {
    this.toggleProperty(name);
    this.model.set(name, this[name]);
    setLocalStorage(name, this[name]);
    this.loading = true;
    await this.model.reload();
    this.loading = false;
    this.model.updateSelectedRow();
  }

  @action
  updateSearch(event) {
    const term = event.target.value;

    if (term === this.search) {
      return;
    }

    if (term && term.length === 1) {
      return;
    }

    debounce(this, this.doSearch, term, 250);
  }

  @action
  toggleGroupingPatternFromSelectedRows() {
    this.buildingGroupingPattern = !this.buildingGroupingPattern;
    this.rowMessagesForGroupingPattern = [];
  }

  @action
  async createGroupingPatternFromSelectedRows() {
    let match = this.findLongestMatchingPrefix(
      this.rowMessagesForGroupingPattern
    );
    match = this.escapeRegExp(match);

    if (
      match.trim().length &&
      // eslint-disable-next-line no-alert
      confirm(
        `Do you want to create the grouping pattern\n\n"${match}"\n\nCancel = No, OK = Create`
      )
    ) {
      await ajax("/patterns/grouping.json", {
        method: "POST",
        data: {
          pattern: match,
        },
      });
      this.rowMessagesForGroupingPattern = [];
      this.buildingGroupingPattern = false;
      this.model.reload();
    } else if (!match.trim().length) {
      // eslint-disable-next-line no-alert
      alert("Can not create a grouping pattern with the given rows");
    }
  }

  findLongestMatchingPrefix(strings) {
    const shortestString = strings.reduce(
      (shortest, str) => (str.length < shortest.length ? str : shortest),
      strings[0]
    );

    let longestMatchingSubstring = "";
    for (let i = 0; i < shortestString.length; i++) {
      const currentSubstring = shortestString.substring(0, i + 1);

      if (strings.every((str) => str.includes(currentSubstring))) {
        longestMatchingSubstring = currentSubstring;
      } else {
        break;
      }
    }

    return longestMatchingSubstring;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
  }
}
