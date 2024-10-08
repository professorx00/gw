import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";
/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class BoilerplateItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
    context.effects = prepareActiveEffectCategories(this.document.effects);
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    html
      .find(".effect-control")
      .click((ev) => onManageActiveEffect(ev, this.document));
    // Roll handlers, click handlers, etc. would go here.
    html.find(".hasBoon").click(this._hasBoon.bind(this));
    html.find(".changePassive").click(this._changePassive.bind(this));
    html.find(".isRanged").click(this._isRanged.bind(this));
    html.find(".poolType").click(this._poolTypeSelect.bind(this));
    html.find(".rangeSelect").click(this._rangeSelect.bind(this));
    html.find(".lmhType").click(this._lhmTypeSelect.bind(this));
    html.find(".session").click(this._oncePerSession.bind(this));
    html.find(".scene").click(this._oncePerScene.bind(this));
  }

  async _hasBoon() {
    await this.object.update({ "system.hasBoon": !this.object.system.hasBoon });
  }

  async _changePassive() {
    await this.object.update({ "system.passive": !this.object.system.passive });
  }

  async _isRanged() {
    await this.object.update({
      "system.isRangedWeapon": !this.object.system.isRangedWeapon,
    });
  }

  async _oncePerScene() {
    await this.object.update({ "system.scene": !this.object.system.scene });
  }

  async _oncePerSession() {
    await this.object.update({ "system.session": !this.object.system.session });
  }

  async _poolTypeSelect(event) {
    const element = event.currentTarget;
    const value = element.value;
    await this.object.update({ "system.pool": value });
  }

  async _lhmTypeSelect(event) {
    const element = event.currentTarget;
    const value = element.value;
    await this.object.update({ "system.lmh": value });
  }
  async _rangeSelect(event) {
    const element = event.currentTarget;
    const value = element.value;
    await this.object.update({ "system.range": value });
  }
}
