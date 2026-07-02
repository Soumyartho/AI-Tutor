// GraphPlotter (US-004): interactive y = mx + b with a draggable point.
// Numeric readout + keyboard inputs provide a non-graphical equivalent (a11y).
import { useState } from "react";
import { Coordinates, Line, Mafs, Point, useMovablePoint } from "mafs";
import "mafs/core.css";

export function GraphPlotter() {
  const [intercept, setIntercept] = useState(0);
  const slopePoint = useMovablePoint([1, 1]);

  // slope derived from the movable point relative to the y-intercept.
  const slope = slopePoint.point[0] === 0 ? 0 : (slopePoint.point[1] - intercept) / slopePoint.point[0];

  return (
    <section className="plotter">
      <div className="plotter-readout" aria-live="polite">
        <label htmlFor="intercept">y-intercept (b)</label>
        <input
          id="intercept"
          type="number"
          value={intercept}
          step={0.5}
          onChange={(e) => setIntercept(Number(e.target.value))}
        />
        <span>
          Line: y = {slope.toFixed(2)}x + {intercept.toFixed(2)}
        </span>
      </div>
      <Mafs height={360}>
        <Coordinates.Cartesian />
        <Line.PointSlope point={[0, intercept]} slope={slope} color="var(--color-primary)" />
        <Point x={0} y={intercept} color="var(--color-accent-math)" />
        {slopePoint.element}
      </Mafs>
    </section>
  );
}
