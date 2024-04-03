// Import document classes.
import { GWActor } from "./documents/actor.mjs";
import { BoilerplateItem } from "./documents/item.mjs";
import GWCombatant from "./documents/gwcombatant.mjs";
// Import sheet classes.
import { GWActorSheet } from "./sheets/actor-sheet.mjs";
import { BoilerplateItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { BOILERPLATE } from "./helpers/config.mjs";
import GWCombat from "./documents/gwcombat.mjs";
import { TargetContainer } from "./app/targetnumber.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  console.log("********************Loading GW System ***************");

  checkDsNSetting();
  registerSystemSettings();
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.gw = {
    GWActor,
    BoilerplateItem,
    rollItemMacro,
  };
  // Add custom constants for configuration.
  CONFIG.BOILERPLATE = BOILERPLATE;
  CONFIG.Combatant.documentClass = GWCombatant;
  CONFIG.Combat.documentClass = GWCombat;
  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d12",
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = GWActor;
  CONFIG.Item.documentClass = BoilerplateItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("gw", GWActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("gw", BoilerplateItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper("concat", function () {
  var outStr = "";
  for (var arg in arguments) {
    if (typeof arguments[arg] != "object") {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper("toLowerCase", function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("isWere", function (str) {
  if (str && str !== "") {
    return str.includes("were") || str.includes("Were");
  } else {
    return false;
  }
});

Handlebars.registerHelper("isBane", function (str) {
  return str == "true";
});

Handlebars.registerHelper("isArcane", function (str) {
  if (str && str !== "") {
    return str.includes("arcane") || str.includes("Arcane");
  } else {
    return false;
  }
});

Handlebars.registerHelper("isPhysical", function (str) {
  if (str && str !== "") {
    return str.includes("physical") || str.includes("Physical");
  } else {
    return false;
  }
});

Handlebars.registerHelper("isMental", function (str) {
  if (str && str !== "") {
    return str.includes("mental") || str.includes("Mental");
  } else {
    return false;
  }
});

Handlebars.registerHelper("targetNumber", function (str) {
  let number = parseInt(str);
  console.log("TN ", number);
  if (number <= 12) {
    return "true";
  } else return "false";
});
/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
  //Add Target Number to Game System and Canvas
  const app = TargetContainer.create();
  if (app.targets.length === 0) app.addTarget();
});

Hooks.on("preCreateChatMessage", async (message) => {
  // console.log("preCreate", message);
});

Hooks.on("preUpdateChatMessage", (message, data) => {
  console.log("preUpdate", message, data);
});

Hooks.on("dropActorSheetData", async (actor, actorsheet, data) => {});

Hooks.on("renderChatMessage", async (message, html) => {});
/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.gw.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "gw.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

function checkDsNSetting() {
  game.settings.register(game.system.id, "dsnSettingInit", {
    name: "Flag for Dice So Nice settings init",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });
}

function registerSystemSettings() {
  game.settings.register("gw", "targets", {
    name: "gw-targets",
    hint: "GW Targets",
    scope: "world",
    config: false,
    requiresReload: false,
    type: Array,
    default: [],
    onChange: () => TargetContainer._onUpdate(),
  });
}
/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

async function rollActorDamage(actor) {
  console.log("clicked");
} 