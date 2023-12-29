/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class GWActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.boilerplate || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== "character") return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      // Calculate the modifier using d20 rules.
      ability.mod = Math.floor((ability.value - 10) / 2);
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== "npc") return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== "character") return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== "npc") return;

    // Process additional NPC data here.
  }

  async doRoll(dataset, actorData) {
    let title = game.i18n.localize("GW.Roll");
    let rollInfo = {};
    rollInfo.globalTN = game.settings.get("gw", "targets")[0].value;
    let actionText = "";
    let poolAmount = 0;
    let current = dataset.current;
    rollInfo.targets = game.users.current.targets;
    let hasBane = current <= 5;
    rollInfo.current = dataset.current;
    rollInfo.hasBane = hasBane;
    dataset.hasBane = hasBane;
    const dlgContent = await renderTemplate(
      "systems/gw/templates/dialogs/pcrolls.hbs",
      dataset
    );

    switch (dataset.rolltype) {
      case "PCheck":
        title = game.i18n.localize("GW.PCheck");
        actionText = title + " for " + this.name;
        rollInfo.pool = "physical";

        break;
      case "ACheck":
        title = game.i18n.localize("GW.ACheck");
        actionText = title + " for " + this.name;
        rollInfo.pool = "arcane";

        break;
      case "MCheck":
        title = game.i18n.localize("GW.MCheck");
        actionText = title + " for " + this.name;
        rollInfo.pool = "mental";

        break;
      case "AAttack":
        title = game.i18n.localize("GW.AAttack");
        actionText = title + " for " + this.name;
        rollInfo.pool = "arcane";
        break;
      case "PAttack":
        title = game.i18n.localize("GW.PAttack");
        actionText = title + " for " + this.name;
        rollInfo.pool = "physical";
        break;
      case "MAttack":
        title = game.i18n.localize("GW.MAttack");
        actionText = title + " for " + this.name;
        rollInfo.pool = "mental";
        break;
      case "ACast":
        title = game.i18n.localize("GW.ACast");
        actionText = title + " for " + this.name;
        rollInfo.pool = "arcane";
        break;
      case "PCast":
        title = game.i18n.localize("GW.PCast");
        actionText = title + " for " + this.name;
        rollInfo.pool = "physical";
        break;
      case "MCast":
        title = game.i18n.localize("GW.MCast");
        actionText = title + " for " + this.name;
        rollInfo.pool = "mental";
        break;
      case "arcaneNPC":
        title = game.i18n.localize("GW.NPCAttack");
        actionText = title + " for " + this.name;
        rollInfo.pool = "pool";
        break;
      case "physicalNPC":
        title = game.i18n.localize("GW.NPCAttack");
        actionText = title + " for " + this.name;
        rollInfo.pool = "physical";
        break;
      case "mentalNPC":
        title = game.i18n.localize("GW.NPCAttack");
        actionText = title + " for " + this.name;
        rollInfo.pool = "mental";
        break;
    }

    const dlg = new Dialog(
      {
        title: title,
        content: dlgContent,
        buttons: {
          roll: {
            icon: "<i class='fas fa-dice-d12'></i>",
            label: "Roll",
            callback: (html) => rollCallback(html, rollInfo),
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "cancel",
          },
        },
        default: "roll",
      },
      {
        id: "check-dialog",
      }
    );

    dlg.render(true);

    async function rollCallback(html, rollInfo) {
      let numDice = 1;
      let boon = html.find('[name="boonbane"]')[0].value.trim();
      let needs = "";
      let targets = [];

      let target = rollInfo.targets;
      if (target.size > 0) {
        target.forEach((toke) => {
          targets.push(toke.document.actor);
        });
        targets = targets.sort((a, b) => {
          if (a.system.toHit < b.system.toHit) {
            return 1;
          } else {
            return -1;
          }
        });
        needs = targets[0].system.toHit.toString();
        console.log("needs 236", needs);
      }
      let modifier = "";
      rollInfo.rollText = "1d12";
      let rollResults = "";
      if (boon != "") {
        boon = Number.parseInt(boon);
        numDice += Math.abs(boon);

        if (boon < 0) {
          rollInfo.rollText =
            numDice +
            "d12 " +
            game.i18n.localize("GW.with") +
            " " +
            game.i18n.localize("GW.Bane");
          modifier = "kl";
        } else if (boon > 0) {
          rollInfo.rollText =
            numDice +
            "d12 " +
            game.i18n.localize("GW.with") +
            " " +
            game.i18n.localize("GW.Boon");
          modifier = "kh";
        }
      }

      const formula = numDice + "d12" + modifier;
      const diceRoll = await new Roll(formula).evaluate({ async: true });
      let rollHTML = await diceRoll.render();

      rollHTML = rollHTML.replace(formula, rollInfo.rollText);
      const rollData = {
        rollType: actionText,
        rollHTML: rollHTML,
        needs: needs != "" ? needs : rollInfo.globalTN,
        rollResults: rollResults,
        poolType: rollInfo.pool,
        total: diceRoll._total,
        poolValue: rollInfo.current,
        rollText: rollInfo.rollText,
      };

      const usePPContent = await renderTemplate(
        "systems/gw/templates/dialogs/ppoints.hbs",
        rollData
      );

      const ppdlg = new Dialog({
        title: "Do you want to use Power Points?",
        content: usePPContent,
        buttons: {
          roll: {
            label: "Confirm",
            callback: (html) => {
              usePoolPoints(html, rollData, diceRoll, actorData);
            },
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "cancel",
            callback: (html) => sendRolltoChat(html, rollData, diceRoll),
          },
        },
      });

      ppdlg.render(true);
    }

    async function usePoolPoints(html, rollData, diceRoll, actorData) {
      let poolPoints = html.find('[name="poolPoints"]')[0].value.trim();
      let change =
        actorData.system[rollData.poolType].current - parseInt(poolPoints);
      let label = `system.${rollData.poolType}.current`;
      actorData.update({ [label]: change });
      let newTotal = rollData.total + parseInt(poolPoints);
      if (newTotal >= rollData.needs) {
        rollData.rollResults = "Success";
      } else {
        rollData.rollResults = "Failure";
      }
      rollData.rollHTML = rollData.rollHTML.replace(rollData.total, newTotal);
      rollData.rollHTML = rollData.rollHTML.replace(
        `<h4 class="dice-total">${rollData.total}</h4>`,
        `<h4 class="dice-total">${newTotal}</h4>`
      );

      rollData.rollHTML = rollData.rollHTML.replace(
        rollData.rollText,
        rollData.rollText + "+" + poolPoints
      );
      sendRolltoChat(html, rollData, diceRoll);
    }

    async function sendRolltoChat(html, rollData, diceRoll) {
      let cardContent = await renderTemplate(
        "systems/gw/templates/chatcards/normalroll.hbs",
        rollData
      );

      const chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: diceRoll,
        content: cardContent,
        speaker: ChatMessage.getSpeaker({ actor: this }),
      };
      ChatMessage.create(chatOptions);
    }
  }

  async rollDamage(dataset, actorData) {
    const dlgContent = await renderTemplate(
      "systems/gw/templates/dialogs/damageRolls.hbs",
      dataset
    );
    let title = game.i18n.localize("GW.Roll");
    let actionText = "";
    let weaponFormula = dataset.formula;
    const dlg = new Dialog(
      {
        title: title,
        content: dlgContent,
        buttons: {
          roll: {
            icon: "<i class='fas fa-dice-d12'></i>",
            label: "Roll",
            callback: (html) => rollCallback(html),
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "cancel",
          },
        },
        default: "roll",
      },
      {
        id: "roll-dialog",
      }
    );

    dlg.render(true);

    async function rollCallback(html) {
      let powerDie = html.find('[name="powerDieCheck"]')[0].checked;
      let rollResults = "";
      let actionText = "Damage";

      if (powerDie) {
        weaponFormula =
          weaponFormula + "+1" + actorData.system.attributes.powerDie;
      }
      const diceRoll = await new Roll(weaponFormula).evaluate({ async: true });
      let rollHTML = await diceRoll.render();
      const rollData = {
        rollType: actionText,
        rollHTML: rollHTML,
        rollResults: rollResults,
      };
      sendRolltoChat(html, rollData, diceRoll);
    }

    async function sendRolltoChat(html, rollData, diceRoll) {
      let cardContent = await renderTemplate(
        "systems/gw/templates/chatcards/normalroll.hbs",
        rollData
      );

      const chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: diceRoll,
        content: cardContent,
        speaker: ChatMessage.getSpeaker({ actor: this }),
      };
      ChatMessage.create(chatOptions);
    }
  }

  _updatePowerDie(value) {
    this.update({ "system.attributes.powerDie": value });
  }
  _updateInitDie(value) {
    console.log("init Value", value);
    this.update({ "system.init": value });
  }

  async _rollPowerDie(dataset, actorData) {
    let powerDie = dataset.powerdie;
    let html = "";
    let formula = "1" + powerDie;
    let actionText = "Power Die Roll";
    let rollResults = "";
    const diceRoll = await new Roll(formula).evaluate({ async: true });
    let rollHTML = await diceRoll.render();
    const rollData = {
      rollType: actionText,
      rollHTML: rollHTML,
      rollResults: rollResults,
    };
    sendRolltoChat(html, rollData, diceRoll);

    async function sendRolltoChat(html, rollData, diceRoll) {
      let cardContent = await renderTemplate(
        "systems/gw/templates/chatcards/normalroll.hbs",
        rollData
      );

      const chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: diceRoll,
        content: cardContent,
        speaker: ChatMessage.getSpeaker({ actor: this }),
      };
      ChatMessage.create(chatOptions);
    }
  }

  async rollNPCAttack(dataset) {
    const dlgContent = await renderTemplate(
      "systems/gw/templates/dialogs/damageRolls.hbs",
      dataset
    );
    let title = game.i18n.localize("GW.Roll");
  }
}