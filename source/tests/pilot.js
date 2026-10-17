export function pilot(run, route = "safe") {
  let loops = 0;
  while (run.phase === "play" && loops++ < 150000) {
    let near = run.objects.filter(
      (o) =>
        !o.dead &&
        o.at - run.distance > 0 &&
        o.at - run.distance < 35 &&
        [
          "wall",
          "rock",
          "cart",
          "train",
          "barrier",
          "saw",
          "laser",
          "gap",
          "drone",
          "bolt",
        ].includes(o.type),
    );
    let costs = [-1, 0, 1]
      .map((l) => ({
        l,
        c:
          Math.abs(l - run.lane) * 0.4 +
          near.reduce(
            (s, o) =>
              s +
              (Math.abs((o.type === "saw" ? o.baseX : o.x) - l * 3.2) < 1.3
                ? (["wall", "train", "drone", "rock", "cart"].includes(o.type)
                    ? 5
                    : o.type === "bolt"
                      ? 3
                      : 1.5) *
                  (1 - (o.at - run.distance) / 40)
                : 0),
            0,
          ),
      }))
      .sort((a, b) => a.c - b.c);
    let target = costs[0].l;
    if (run.fork && run.fork.at - run.distance < 25)
      target = route === "risk" ? 1 : -1;
    if (target < run.lane) run.action("left");
    if (target > run.lane) run.action("right");
    let hazard = near
      .filter(
        (o) => Math.abs((o.type === "saw" ? o.baseX : o.x) - run.x) < 1.25,
      )
      .sort((a, b) => a.at - b.at)[0];
    if (hazard) {
      let eta = (hazard.at - run.distance) / run.speed;
      if (
        ["barrier", "saw", "gap"].includes(hazard.type) &&
        eta < 0.38 &&
        eta > 0.12
      )
        run.action("jump");
      if (hazard.type === "laser" && eta < 0.6) run.action("slide");
    }
    // Use visible interactive objects before drones to exercise environmental fights.
    let targets = run.objects
      .filter(
        (o) =>
          !o.dead &&
          ["barrel", "vent", "panel", "drone"].includes(o.type) &&
          o.at - run.distance < 95 &&
          o.at - run.distance > 8,
      )
      .sort(
        (a, b) =>
          (a.type === "drone" ? 1 : 0) - (b.type === "drone" ? 1 : 0) ||
          a.at - b.at,
      );
    run.fire(targets[0]?.id ?? null);
    run.step(0.04);
    run.takeEvents();
  }
  return run.result;
}
