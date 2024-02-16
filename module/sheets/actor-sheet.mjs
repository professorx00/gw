import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import { TargetContainer } from "../app/targetnumber.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class GWActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gw", "sheet", "actor"],
      template: "systems/gw/templates/actor/actor-sheet.html",
      width: 900,
      height: 900,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "features",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/gw/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == "character") {
      this._prepareItems(context, "character");
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == "npc") {
      this._prepareItems(context, "npc");
    }
    if (actorData.type == "vehicle") {
      this._prepareItems(context, "vehicle");
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context, type) {
    // Initialize containers.
    const isGM = game.user.isGM;
    const gear = [];
    const weapons = [];
    const defense = [];
    const feats = [];
    const vehicleParts = [];
    const fightingStances = [];
    const magicalSociety = [];
    const scrolls = [];
    const wands = [];
    const consumables = [];
    const abilities = [];
    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to weapon.
      if (i.type === "weapon") {
        weapons.push(i);
      }
      // Append to defense.
      if (i.type === "defense") {
        defense.push(i);
      }
      // Append to defense.
      if (i.type === "item") {
        gear.push(i);
      }
      if (i.type === "vehicle-parts") {
        vehicleParts.push(i);
      }
      if (i.type === "fighting-stances") {
        fightingStances.push(i);
      }
      if (i.type === "magical-society") {
        magicalSociety.push(i);
      }
      if (i.type === "scroll") {
        scrolls.push(i);
      }
      if (i.type === "wand") {
        wands.push(i);
      }
      if (i.type === "consumable") {
        consumables.push(i);
      }
      if (i.type === "npc-ability") {
        abilities.push(i);
      }
      // Append to features.
      else if (i.type === "feat") {
        feats.push(i);
      }
    }

    // Assign and return
    context.gear = gear;
    context.weapons = weapons;
    context.defense = defense;
    context.feats = feats;
    context.fightingStances = fightingStances;
    context.vehicleParts = vehicleParts;
    context.magicalSociety = magicalSociety;
    context.vehicle = type == "vehicle" ? true : false;
    context.otherType = type != "vehicle" ? true : false;
    context.scrolls = scrolls;
    context.wands = wands;
    context.consumables = consumables;
    context.isGM = isGM;
    context.abilities = abilities;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find(".item-create").click(this._onItemCreate.bind(this));
    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    html.find(".item-quantity-descrease").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.removeQuantity();
    });
    html.find(".item-quantity-increase").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.addQuantity();
    });

    // Active Effect management
    html
      .find(".effect-control")
      .click((ev) => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find(".rollable").click(this._onRoll.bind(this));

    html.find(".rollCheck").click(this._onRoll.bind(this));
    html.find(".rollDamage").click(this._onRollDamage.bind(this));
    html.find(".rollWeaponAttack").click(this._rollWeaponAttack.bind(this));

    html.find(".powerDie").click(this._onPowerDieSelect.bind(this));
    html.find(".initDie").click(this._onInitSelect.bind(this));
    html.find(".rollPowerDie").click(this._onRollPowerDie.bind(this));
    html.find(".rollNPC").click(this._onRollNPC.bind(this));
    html.find(".destinyDieMinus").click(this._removeDestinyDie.bind(this));
    html.find(".destinyDiePlus").click(this._addDestinyDie.bind(this));
    html.find(".destinyDieSave").click(this._saveDestinyDie.bind(this));
    html.find(".destinyDieReset").click(this._resetDestinyDie.bind(this));
    html.find(".destinyDieroll").click(this._rollDestinyDie.bind(this));

    html.find(".resetPool").click(this._resetPool.bind(this));
    html.find(".shapeShift").click(this._handleShapeShift.bind(this));
    html.find(".hasBoon").click(this._changeBoon.bind(this));
    html.find(".equipped").click(this._changeEquip.bind(this));
    html.find(".rollInit").click(this._rollInit.bind(this));
    html.find(".abilityRoll").click(this._rollAbility.bind(this));

    html.find(".clickDesc").click(this._handleDescription.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  // _onRoll(event) {
  //   event.preventDefault();
  //   const element = event.currentTarget;
  //   const dataset = element.dataset;

  //   // Handle item rolls.
  //   if (dataset.rollType) {
  //     if (dataset.rollType == "item") {
  //       const itemId = element.closest(".item").dataset.itemId;
  //       const item = this.actor.items.get(itemId);
  //       if (item) return item.roll();
  //     }
  //   }

  //   // Handle rolls that supply the formula directly.
  //   if (dataset.roll) {
  //     let label = dataset.label ? `[ability] ${dataset.label}` : "";
  //     let roll = new Roll(dataset.roll, this.actor.getRollData());
  //     roll.toMessage({
  //       speaker: ChatMessage.getSpeaker({ actor: this.actor }),
  //       flavor: label,
  //       rollMode: game.settings.get("core", "rollMode"),
  //     });
  //     return roll;
  //   }
  // }

  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    console.log(dataset);
    await this.actor.doRoll(dataset);
  }

  async _onRollDamage(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    //Roll the Attack
    // await this.actor.doRoll(dataset, this.actor);
    //Take Attack Results

    //Roll the Damage

    // Report Everything to chat
    await this.actor.rollDamage(dataset, this.actor);
  }

  async _rollWeaponAttack(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    let pooltype = dataset.powertype.toLowerCase();

    dataset.current = this.actor.system[pooltype].current;
    dataset.hasBane = dataset.current <= 5;
    console.log(pooltype);
    switch (pooltype) {
      case "arcane":
        dataset.rolltype = "AAttack";
        break;
      case "physical":
        dataset.rolltype = "PAttack";
        break;
      case "mental":
        dataset.rolltype = "MAttack";
        break;
      default:
        dataset.rolltype = "PAttack";
        break;
    }
    await this.actor.doRoll(dataset);
  }

  async _onRollPowerDie(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    let targets = game.settings.get("gw", "targets");
    console.log(targets);

    this.actor._rollPowerDie(dataset);
  }

  async _onPowerDieSelect(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const value = element.value;
    await this.actor._updatePowerDie(value);
  }
  async _onInitSelect(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const value = element.value;
    await this.actor._updateInitDie(value);
  }

  async _onRollNPC(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    await this.actor.doRoll(dataset, this.actor);
  }
  async _removeDestinyDie() {
    const DDieCurrent = this.actor.system.DDie;
    const newDDie = DDieCurrent - 1 > 0 ? DDieCurrent - 1 : 0;
    this.actor.update({ "system.DDie": newDDie });
  }
  async _addDestinyDie() {
    const DDieCurrent = this.actor.system.DDie;
    const newDDie = DDieCurrent + 1 > 0 ? DDieCurrent + 1 : 0;
    this.actor.update({ "system.DDie": newDDie });
  }
  async _saveDestinyDie() {
    this.actor.update({ "system.startingDDie": this.actor.system.DDie });
  }
  async _resetDestinyDie() {
    this.actor.update({ "system.DDie": this.actor.system.startingDDie });
  }

  async _resetPool(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    let pool = dataset.pool;
    let systemPoolCurrent = `system.${pool}.current`;
    this.actor.update({ [systemPoolCurrent]: this.actor.system[pool].base });
  }

  async _handleShapeShift(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    let newBase;
    let newCurrent;
    if (!this.actor.system.shapeshift) {
      newBase = this.actor.system.physical.base + 3;
      newCurrent = this.actor.system.physical.current + 3;
    } else {
      newBase = this.actor.system.physical.base - 3;
      newCurrent = this.actor.system.physical.current - 3;
    }
    this.actor.update({
      "system.physical.base": newBase,
      "system.physical.current": newCurrent,
      "system.shapeshift": !this.actor.system.shapeshift,
    });
  }

  async _changeBoon(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const id = dataset.itemId;

    this.actor.items.forEach((item) => {
      if (item._id == id) {
        item.update({ "system.hasBoon": !item.system.hasBoon });
      }
    });
  }

  async _changeEquip(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const id = dataset.itemId;

    this.actor.items.forEach((item) => {
      if (item._id == id) {
        item.update({ "system.equipped": !item.system.equipped });
      }
    });
  }

  async _rollInit(event) {
    this.actor.rollInitiative();
  }

  async _rollDestinyDie(event) {
    this.actor.rollDestinyDie();
  }
  async _rollAbility(event) {
    this.actor.rollAbility(event);
  }
  async _handleDescription(event) {
    console.log("Dave");
    const element = event.currentTarget;
    let name = element.dataset.item + "_description";
    const el = document.getElementById(name);
    if (el.classList.contains("hidden")) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }
}
