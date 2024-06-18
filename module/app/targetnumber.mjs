export class TargetContainer extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/gw/templates/app/timer-target-container.html",
      classes: ["target-container"],
      title: "GW APP", // Needed otherwise it can break
      popOut: false,
    });
  }

  static create() {
    const app = new this();
    app.render(true);
    game.gw.TargetContainer = app;
    return app;
  }
  static _onUpdate() {
    game.gw.TargetContainer?.render();
  }

  async _render(force = false, options = {}) {
    await super._render(force, options);
    const margin = 8;
    const sidebarRect = $("#sidebar").get(0).getBoundingClientRect();
    this.element.css("right", window.innerWidth - sidebarRect.left + margin);
    $("#ui-top").css("margin-right", this.element.width() + margin);
  }

  addTarget(options = {}) {
    console.log("Adding Target");
    this.targets = this.targets.concat([
      mergeObject(
        { value: 8, isEasy: false, isHard: false, name: "" },
        options
      ),
    ]);
  }

  get targets() {
    return game.settings.get("gw", "targets");
  }

  set targets(value) {
    if (parseInt(value) > 12) {
      value = "12";
    }
    if (parseInt(value) < 1) {
      value = "1";
    }
    game.settings.set("gw", "targets", value);
  }

  getData(_options = {}) {
    return {
      user: game.user,
      targets: this.targets,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!game.user.isGM) return;

    html.find("input[data-target]").change((ev) => {
      const ct = $(ev.currentTarget);
      const target = ct.data("target");
      let value = ct.val();
      if (parseInt(value) > 12) {
        value = "12";
      }
      if (parseInt(value) < 1) {
        value = "1";
      }
      this.targets[0].value = value;
      let el = html.find("input[data-target]");
      el[0].value = value;
    });
  }
}
