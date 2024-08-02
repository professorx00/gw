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

    // // Copy the ability scores to the top level, so that rolls can use
    // // formulas like `@str.mod + 4`.
    // if (data.abilities) {
    //   for (let [k, v] of Object.entries(data.abilities)) {
    //     data[k] = foundry.utils.deepClone(v);
    //   }
    // }

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

  async doRoll(dataset) {
    let rolltype = dataset.rollType;
    let pool = dataset.powertype;
    switch (rolltype) {
      case "weapon":
        dataset.title = "Weapon Attack";
        this.rolling(dataset);
        break;
      case "feat":
        break;
      case "attack":
        this.rolling(dataset);
        break;
      case "cast":
        this.rolling(dataset);
        break;
      case "Cast Wand":
        this.castWand(dataset);
        break;
      case "Cast Scroll":
        this.castScroll(dataset);
        break;
      case "NPC":
        this.rolling(dataset);
        break;
    }
  }

  async rolling(dataset) {
    let globalTN = game.settings.get("gw", "targets")[0].value;
    let crit = 12;
    // if (dataset.hasOwnProperty("crit")) {
    //   crit = dataset.crit;
    // }
    let targetTN = 0;
    let actorTargets = game.users.current.targets;
    actorTargets.forEach((target) => {
      const actor = game.actors.get(target.document.actorId);
      if (targetTN < parseInt(actor.system.toHit)) {
        targetTN = parseInt(actor.system.toHit);
      }
    });
    let target = targetTN > 0 ? targetTN : globalTN;
    let pool = dataset.powertype;
    let current = dataset.current;
    let hasBane = 0;
    let hasBoon = 0;
    if (dataset.hasboon == "true") {
      hasBoon = hasBoon + 1;
    }

    if (this.system.arcane.current <= 0) {
      hasBane = hasBane + 1;
    }
    if (this.system.physical.current <= 0) {
      hasBane = hasBane + 1;
    }
    if (this.system.mental.current <= 0) {
      hasBane = hasBane + 1;
    }
    let boonsBanes = hasBane * -1 + hasBoon;
    let rollInfo = {
      ...dataset,
      target: target,
      pool: pool,
      boonsBanes: boonsBanes,
      current: current,
      crit: crit,
    };

    const weaponRollContent = await renderTemplate(
      "systems/gw/templates/dialogs/pcrolls.hbs",
      rollInfo
    );

    const weaponDlg = new Dialog(
      {
        title: "Attack",
        content: weaponRollContent,
        buttons: {
          roll: {
            icon: "<i class='fas fa-dice-d12'></i>",
            label: "Roll",
            callback: (html) => this.weaponCallback(html, rollInfo),
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

    weaponDlg.render(true);
  }

  async noAmmo() {
    let rollInfo = {};
    const weaponRollContent = await renderTemplate(
      "systems/gw/templates/dialogs/noAmmo.hbs",
      rollInfo
    );

    const weaponDlg = new Dialog({
      title: "No Ammo",
      content: weaponRollContent,
      buttons: {
        cancel: {
          icon: "<i class='fas fa-times'></i>",
          label: "cancel",
        },
      },
      default: "cancel",
    });

    weaponDlg.render(true);
  }
  async castWand(dataset) {
    if (parseInt(dataset.current) < parseInt(dataset.powerpoints)) {
      const wandContent = await renderTemplate(
        "systems/gw/templates/dialogs/wand.hbs",
        dataset
      );

      const wanddlg = new Dialog(
        {
          title: "Wand Error",
          content: wandContent,
          buttons: {
            cancel: {
              icon: "<i class='fas fa-times'></i>",
              label: "cancel",
            },
          },
        },
        {
          id: "wand-dialog",
        }
      );

      wanddlg.render(true);

      return;
    } else {
      const forumla = dataset.formula;

      this.update({
        "system.arcane.current":
          parseInt(dataset.current) - parseInt(dataset.powerpoints),
      });
    }
    this.rolling(dataset);
    // this.rollWandDamage(dataset, "Wand");
  }

  async castScroll(dataset) {
    if (parseInt(dataset.current) < parseInt(dataset.powerpoints)) {
      const wandContent = await renderTemplate(
        "systems/gw/templates/dialogs/scroll.hbs",
        dataset
      );

      const wanddlg = new Dialog(
        {
          title: "Scroll Error",
          content: wandContent,
          buttons: {
            cancel: {
              icon: "<i class='fas fa-times'></i>",
              label: "cancel",
            },
          },
        },
        {
          id: "wand-dialog",
        }
      );

      wanddlg.render(true);

      return;
    } else {
      const forumla = dataset.formula;

      this.update({
        "system.arcane.current":
          parseInt(dataset.current) - parseInt(dataset.powerpoints),
      });
    }
    this.rolling(dataset);
    // this.rollWandDamage(dataset, "Wand");
  }

  async rollDamage(dataset, actorData) {
    const dlgContent = await renderTemplate(
      "systems/gw/templates/dialogs/damageRolls.hbs",
      dataset
    );
    let title = game.i18n.localize("GW.Roll");
    let weaponFormula = dataset.formula;
    if (actorData.type === "character") {
      weaponFormula = weaponFormula;
    }
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
      let CritDie = html.find('[name="critCheck"]')[0].checked;
      let rollResults = "";
      let actionText = "Damage";
      if (powerDie && !CritDie) {
        weaponFormula = weaponFormula + "+1" + actorData.system.powerDie;
      }
      if (powerDie && CritDie) {
        weaponFormula =
          weaponFormula +
          "+" +
          weaponFormula +
          "+" +
          "2" +
          actorData.system.powerDie;
      }
      if (!powerDie && CritDie) {
        weaponFormula = weaponFormula + "+" + weaponFormula;
      }
      if (actorData.type == "character") {
        weaponFormula = weaponFormula + "+" + actorData.system.damageBonus;
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

  async _updatePowerDie(value) {
    await this.update({ "system.powerDie": value });
  }
  async _updateInitDie(value) {
    console.log("init Value", value);
    await this.update({ "system.init": value });
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
    this.sendRolltoChat(html, rollData, diceRoll, "normalroll.hbs");
  }

  async rollDestinyDie() {
    let total = this.system.DDie;
    let actionText = "Destiny Die";
    let rollResults = "";
    let rollHTML = "";
    let html = "";
    let diceRoll;
    if (total > 0) {
      diceRoll = await new Roll("1d12").evaluate({ async: true });
      rollHTML = await diceRoll.render();
    } else {
      return;
    }
    const rollData = {
      rollType: actionText,
      rollHTML: rollHTML,
      rollResults: rollResults,
    };
    this.sendRolltoChat(html, rollData, diceRoll, "normalroll.hbs");
    this.update({ "system.DDie": total - 1 });
  }

  async useDestinyDie(html, rollInfo, previousRollData, previousDiceRoll) {
    let DDie = this.system.DDie;
    //If you have DDie
    if (DDie > 0) {
      this.update({ "system.DDie": DDie - 1 });
      let crit = rollInfo.crit;
      let rollText = "1d12";
      let rollResults = "";
      const diceRoll = await new Roll(rollText).evaluate({ async: true });
      const previousRollData = {
        rollType: rollInfo.title,
        rollHTML: await diceRoll.render(),
        rollResults: rollResults,
        roll: diceRoll._total,
        rollText: rollText,
        ...rollInfo,
      };
      if (diceRoll._total >= crit) {
        previousRollData.rollHTML =
          previousRollData.rollHTML +
          `<div class="critical"><h1>CRITICAL SUCCESS</h1></div>`;

        this.sendRolltoChat(html, previousRollData, diceRoll, "normalroll.hbs");
      } else if (diceRoll._total == 1) {
        previousRollData.rollHTML =
          previousRollData.rollHTML +
          `<div class="critical"><h1>CRITICAL FAILURE</h1></div>`;

        this.sendRolltoChat(html, previousRollData, diceRoll, "normalroll.hbs");
      } else {
        const usePPContent = await renderTemplate(
          "systems/gw/templates/dialogs/ppoints.hbs",
          previousRollData
        );

        const ppdlg = new Dialog({
          title: "Do you want to use Power Points?",
          content: usePPContent,
          buttons: {
            roll: {
              label: "Confirm",
              callback: (html) => {
                this.usePoolPoints(html, previousRollData, diceRoll);
              },
            },
            useDestiny: {
              icon: "",
              label: "Use Destiny Die",
              callback: (html) => {
                this.useDestinyDie(html, rollInfo, previousRollData, diceRoll);
              },
            },
            cancel: {
              icon: "<i class='fas fa-times'></i>",
              label: "cancel",
              callback: (html) => {
                if (previousRollData.success) {
                  previousRollData.rollHTML =
                    previousRollData.rollHTML +
                    `<div class="dicesuccess"><h1>SUCCESS</h1></div>`;
                }
                if (!previousRollData.success) {
                  previousRollData.rollHTML =
                    previousRollData.rollHTML +
                    `<div class="dicefailure"><h1>FAILURE</h1></div>`;
                }
                this.sendRolltoChat(
                  html,
                  previousRollData,
                  diceRoll,
                  "normalroll.hbs"
                );
              },
            },
          },
        });
        ppdlg.render(true);
      }
    } else {
      //If you don't
      const destinyDie = await renderTemplate(
        "systems/gw/templates/dialogs/destinyDieError.hbs",
        previousRollData
      );

      const dialogDDie = new Dialog({
        title: "Do you want to use Power Points?",
        content: destinyDie,
        buttons: {
          roll: {
            label: "Yes",
            callback: (html) => {
              this.usePoolPoints(html, previousRollData, previousDiceRoll);
            },
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "No",
            callback: (html) => {
              if (previousRollData.success) {
                previousRollData.rollHTML =
                  previousRollData.rollHTML +
                  `<div class="dicesuccess"><h1>SUCCESS</h1></div>`;
              }
              if (!previousRollData.success) {
                previousRollData.rollHTML =
                  previousRollData.rollHTML +
                  `<div class="dicefailure"><h1>FAILURE</h1></div>`;
              }
              this.sendRolltoChat(
                html,
                previousRollData,
                previousDiceRoll,
                "normalroll.hbs"
              );
            },
          },
        },
      });

      dialogDDie.render(true);

      // this.sendRolltoChat(
      //   html,
      //   previousRollData,
      //   previousDiceRoll,
      //   "normalroll.hbs"
      // );
    }
  }

  async rollAbility(event) {
    console.log(event);
  }

  async sendRolltoChat(html, rollData, diceRoll, templateName) {
    let cardContent = await renderTemplate(
      `systems/gw/templates/chatcards/${templateName}`,
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

  async displayDestinyMessage(html, rollData, diceRoll) {}

  async weaponCallback(html, rollInfo) {
    let boon = html.find('[name="boonbane"]')[0].value.trim();
    let crit = rollInfo.crit;
    let numberOfDice = Math.abs(boon) + 1;
    let rollText = numberOfDice + "d12";
    if (boon < 0) {
      rollText = rollText + "kl";
    }
    if (boon > 0) {
      rollText = rollText + "kh";
    }
    if (boon == 0) {
      rollText = "1d12";
    }
    const diceRoll = await new Roll(rollText).evaluate({ async: true });
    let rollResults = "";
    const rollData = {
      rollType: rollInfo.title,
      rollHTML: await diceRoll.render(),
      rollResults: rollResults,
      roll: diceRoll._total,
      rollText: rollText,
      ...rollInfo,
    };
    if (diceRoll._total >= crit) {
      rollData.rollHTML =
        rollData.rollHTML +
        `<div class="critical"><h1>CRITICAL SUCCESS</h1></div>`;

      this.sendRolltoChat(html, rollData, diceRoll, "normalroll.hbs");
    } else if (diceRoll._total == 1) {
      rollData.rollHTML =
        rollData.rollHTML +
        `<div class="critical"><h1>CRITICAL FAILURE</h1></div>`;

      this.sendRolltoChat(html, rollData, diceRoll, "normalroll.hbs");
    } else {
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
              this.usePoolPoints(html, rollData, diceRoll);
            },
          },
          useDestiny: {
            icon: "",
            label: "Use Destiny Die",
            callback: (html) => {
              this.useDestinyDie(html, rollInfo, rollData, diceRoll);
            },
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "cancel",
            callback: (html) => {
              if (rollData.success) {
                rollData.rollHTML =
                  rollData.rollHTML +
                  `<div class="dicesuccess"><h1>SUCCESS</h1></div>`;
              }
              if (!rollData.success) {
                rollData.rollHTML =
                  rollData.rollHTML +
                  `<div class="dicefailure"><h1>FAILURE</h1></div>`;
              }
              this.sendRolltoChat(html, rollData, diceRoll, "normalroll.hbs");
            },
          },
        },
      });

      const ppdlgNPC = new Dialog({
        title: "Do you want to use Power Points?",
        content: usePPContent,
        buttons: {
          roll: {
            label: "Confirm",
            callback: (html) => {
              this.usePoolPoints(html, rollData, diceRoll);
            },
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "cancel",
            callback: (html) => {
              if (rollData.success) {
                rollData.rollHTML =
                  rollData.rollHTML +
                  `<div class="dicesuccess"><h1>SUCCESS</h1></div>`;
              }
              if (!rollData.success) {
                rollData.rollHTML =
                  rollData.rollHTML +
                  `<div class="dicefailure"><h1>FAILURE</h1></div>`;
              }
              this.sendRolltoChat(html, rollData, diceRoll, "normalroll.hbs");
            },
          },
        },
      });

      if (rollData.rollType !== "NPC") {
        ppdlg.render(true);
      } else {
        ppdlgNPC.render(true);
      }
    }
  }

  async usePoolPoints(html, rollData, diceRoll) {
    let poolPoints = html.find('[name="poolPoints"]')[0]?.value?.trim();
    if (!poolPoints) {
      poolPoints = html.find('[name="poolPointsa"]')[0].value.trim();
    }
    let change = this.system[rollData.pool].current - parseInt(poolPoints);
    let label = `system.${rollData.pool}.current`;
    this.update({ [label]: change });
    let newTotal = parseInt(rollData.roll) + parseInt(poolPoints);
    if (newTotal >= rollData.target) {
      rollData.rollResults = "Success";
      rollData.success = true;
      rollData.actor = this._id;
    } else {
      rollData.rollResults = "Failure";
      rollData.success = false;
    }
    rollData.rollHTML = rollData.rollHTML.replace(rollData.roll, newTotal);
    rollData.rollHTML = rollData.rollHTML.replace(
      `<h4 class="dice-total">${rollData.roll}</h4>`,
      `<h4 class="dice-total">${newTotal}</h4>`
    );
    rollData.rollHTML = rollData.rollHTML.replace(
      rollData.rollText,
      rollData.rollText + "+" + poolPoints
    );

    if (newTotal >= rollData.crit) {
      rollData.rollHTML =
        rollData.rollHTML +
        `<div class="critical"><h1>CRITICAL SUCCESS</h1></div>`;
    } else if (newTotal == 1) {
      rollData.rollHTML =
        rollData.rollHTML +
        `<div class="critical"><h1>CRITICAL FAILURE</h1></div>`;
    } else if (newTotal >= rollData.target) {
      rollData.rollHTML =
        rollData.rollHTML + `<div class="dicesuccess"><h1>Success</h1></div>`;
    } else {
      rollData.rollHTML =
        rollData.rollHTML + `<div class="dicefailure"><h1>Failure</h1></div>`;
    }
    this.sendRolltoChat(html, rollData, diceRoll, "normalroll.hbs");
  }

  async clearClass(dataset, actorData) {
    let doc = this.items.get(dataset.id);
    if (doc) {
      doc.delete();
    }
    await this.update({ "system.class": "" });
  }

  async clearSpecies(dataset, actorData) {
    this.system.species = "";
    let doc = this.items.get(dataset.id);
    if (doc) {
      doc.delete();
    }
    await this.update({ "system.species": "" });
  }
}