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
      this._prepareItems(context, "character", actorData);
    }

    // Prepare NPC data and items.
    if (actorData.type == "npc") {
      this._prepareItems(context, "npc", actorData);
    }
    if (actorData.type == "vehicle") {
  
      this._prepareItems(context, "vehicle", actorData);
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
    const classes = [];
    const species = [];
    let arcaneCurrent;
    let physicalCurrent;
    let mentalCurrent;
    const flaws = [];
    if (type != "vehicle") {
      arcaneCurrent = context.system.arcane.current;
      physicalCurrent = context.system.physical.current;
      mentalCurrent = context.system.mental.current;
    }

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
      if (i.type === "class") {
        if (classes.length <= 0) {
          classes.push(i);
        }
      }
      if (i.type === "flaws") {
        if (flaws.length <= 0) {
          console.log("we have a flaw we have a flaw see no one cares");
          flaws.push(i);
        }
      }
      if (i.type === "species") {
        if (species.length <= 0) {
          species.push(i);
        }
      }
      // Append to features.
      else if (i.type === "feat") {
        feats.push(i);
      }
    }
    if (classes.length > 0) {
      context.system.class = classes[0].name;
      context.classId = classes[0]._id;
    }
    if (species.length > 0) {
      context.system.species = species[0].name;
      context.speciesId = species[0]._id;
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
    context.arcane = arcaneCurrent;
    context.physical = physicalCurrent;
    context.mental = mentalCurrent;
    context.flaws = flaws;
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
    html.find(".clearClass").click(this._handleClearClass.bind(this));
    html.find(".clearSpecies").click(this._handleClearSpecies.bind(this));
    html.find(".hasBoon").click(this._changeBoon.bind(this));
    html.find(".equipped").click(this._changeEquip.bind(this));
    html.find(".rollInit").click(this._rollInit.bind(this));
    html.find(".abilityRoll").click(this._rollAbility.bind(this));
    html.find(".reload").click(this._reload.bind(this));
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
    await this.actor.rollDamage(dataset, this.actor);
  }

  async _rollWeaponAttack(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const id = dataset.itemId;
    const isRanged = dataset.isranged;
    let pooltype = dataset.powertype.toLowerCase();
    let noAmmo = false;
    if (isRanged == "true") {
      noAmmo = await this.removeClip(id);
    }
    if (noAmmo) {
      await this.actor.noAmmo();
      return;
    }
    dataset.current = this.actor.system[pooltype].current;
    await this.actor.doRoll(dataset);
  }

  async _onRollPowerDie(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    let targets = game.settings.get("gw", "targets");
    console.log(targets);

    await this.actor._rollPowerDie(dataset);
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
    await this.actor.update({ "system.DDie": newDDie });
  }
  async _addDestinyDie() {
    const DDieCurrent = this.actor.system.DDie;
    const newDDie = DDieCurrent + 1 > 0 ? DDieCurrent + 1 : 0;
    await this.actor.update({ "system.DDie": newDDie });
  }
  async _saveDestinyDie() {
    await this.actor.update({ "system.startingDDie": this.actor.system.DDie });
  }
  async _resetDestinyDie() {
    await this.actor.update({ "system.DDie": this.actor.system.startingDDie });
  }

  async _resetPool(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    let pool = dataset.pool;
    let systemPoolCurrent = `system.${pool}.current`;
    await this.actor.update({ [systemPoolCurrent]: this.actor.system[pool].base });
  }

  async _handleShapeShift(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    let newBase;
    let newCurrent;
    if (!this.actor.system.shapeshift) {
      newBase = this.actor.system.physical.base + 2;
      newCurrent = this.actor.system.physical.current + 2;
    } else {
      newBase = this.actor.system.physical.base - 2;
      newCurrent = this.actor.system.physical.current - 2;
    }
    await this.actor.update({
      "system.physical.base": newBase,
      "system.physical.current": newCurrent,
      "system.shapeshift": !this.actor.system.shapeshift,
    });
  }

  async _changeBoon(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const id = dataset.itemId;

    let item = this.actor.items.get(id);
    console.log(item);
    await item.update({ "system.hasBoon": !item.system.hasBoon });
  }

  async _reload(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const id = dataset.itemId;

    let item = this.actor.items.get(id);
    console.log(item);
    await item.update({ "system.clips.current": item.system.clips.base });
  }
  async removeClip(id) {
    let item = this.actor.items.get(id);
    if (item.system.clips.current > 0) {
      await item.update({
        "system.clips.current": item.system.clips.current - 1,
      });
      return false;
    } else {
      return true;
    }
  }

  async _changeEquip(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const id = dataset.itemId;

    this.actor.items.forEach(async (item) => {
      if (item._id == id) {
        await item.update({ "system.equipped": !item.system.equipped });
      }
    });
  }

  async _rollInit(event) {
    await this.actor.rollInitiative();
  }

  async _rollDestinyDie(event) {
    await this.actor.rollDestinyDie();
  }
  async _rollAbility(event) {
    await this.actor.rollAbility(event);
  }
  async _handleDescription(event) {
    console.log("Dave");
    const element = event.currentTarget;
    let name = element.dataset.item + "_description";
    const el = document.getElementById(name);
    console.log(el)
    if (el.classList.contains("hidden")) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  async _handleClearClass(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    await this.actor.clearClass(dataset);
  }
  async _handleClearSpecies(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    await this.actor.clearSpecies(dataset);
  }
}

