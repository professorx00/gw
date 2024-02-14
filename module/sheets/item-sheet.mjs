/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class BoilerplateItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gw", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = "systems/gw/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.find(".hasBoon").click(this._hasBoon.bind(this));
    html.find(".poolType").click(this._poolTypeSelect.bind(this));
    html.find(".session").click(this._oncePerSession.bind(this));
    html.find(".scene").click(this._oncePerScene.bind(this));
  }

  async _hasBoon() {
    this.object.update({ "system.hasBoon": !this.object.system.hasBoon });
  }

  async _oncePerScene() {
    this.object.update({ "system.scene": !this.object.system.scene });
  }

  async _oncePerSession() {
    this.object.update({ "system.session": !this.object.system.session });
  }

  async _poolTypeSelect(event) {
    const element = event.currentTarget;
    const value = element.value;
    this.object.update({ "system.pool": value });
  }
}
