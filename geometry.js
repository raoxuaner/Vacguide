/**
 * Rigid-panel kinematics for the VacGuide interface.
 * Coordinates are millimetres: +X follows the initially flat chain, +Y is its
 * width, and +Z points above the flat assembly. This is a geometric preview,
 * not a model of membrane mechanics, force, pressure, collision, or reset.
 */
const add = (a, b) => a.map((v, i) => v + b[i]);
const mul = (a, s) => a.map(v => v * s);
const mix = (a, s, b, t) => add(mul(a, s), mul(b, t));
const clamp01 = value => Math.max(0, Math.min(1, value));
const finite = (value, name) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} must be finite`);
  return number;
};

/**
 * Build a serial chain with N joints and N+1 separate rectangular panels.
 * Each gap is split evenly on the two sides of its mathematical pivot. Thus
 * folding preserves both panel dimensions and the two half-gap lengths.
 * A channel factor, if provided for a joint's group, multiplies progress.
 * Positive out-of-plane angles lift +X toward +Z; positive in-plane angles
 * turn +X toward +Y. Directions are +1 or -1; progress/factors clamp to [0,1].
 */
export function buildAssembly(project, progress = 1, channelFactors = null) {
  if (!project || !Array.isArray(project.joints)) throw new TypeError('A project with joints is required');
  const length = finite(project.panelLength, 'panelLength');
  const span = finite(project.span, 'span');
  const gap = finite(project.gap, 'gap');
  if (length <= 0 || span <= 0 || gap < 0) throw new RangeError('Panel dimensions must be positive and gap nonnegative');
  const fraction = clamp01(finite(progress, 'progress'));
  const panels = [];
  const joints = [];
  let origin = [0, 0, 0];
  let x = [1, 0, 0], y = [0, 1, 0], z = [0, 0, 1];

  const appendPanel = index => {
    const far = add(origin, mul(x, length));
    panels.push({
      id: `P${index + 1}`,
      vertices: [
        add(origin, mul(y, -span / 2)),
        add(far, mul(y, -span / 2)),
        add(far, mul(y, span / 2)),
        add(origin, mul(y, span / 2)),
      ],
      center: add(origin, mul(x, length / 2)),
    });
    return far;
  };

  let far = appendPanel(0);
  for (const [index, joint] of project.joints.entries()) {
    const targetAngle = finite(joint.angle, `joints[${index}].angle`);
    const direction = joint.direction === -1 ? -1 : 1;
    const factor = channelFactors?.[joint.group] == null
      ? 1
      : clamp01(finite(channelFactors[joint.group], `channel ${joint.group}`));
    const angle = targetAngle * direction * fraction * factor;
    const radians = angle * Math.PI / 180;
    const c = Math.cos(radians), s = Math.sin(radians);
    const pivot = add(far, mul(x, gap / 2));
    const plane = joint.plane === 'in' ? 'in' : 'out';
    const axis = [...(plane === 'out' ? y : z)];
    if (plane === 'out') {
      // Rotation about local -Y makes a positive angle lift the chain.
      const nextX = mix(x, c, z, s);
      z = mix(x, -s, z, c);
      x = nextX;
    } else {
      const nextX = mix(x, c, y, s);
      y = mix(x, -s, y, c);
      x = nextX;
    }
    joints.push({
      id: joint.id || `J${index + 1}`,
      origin: pivot,
      axis,
      span,
      angle,
      targetAngle,
      group: joint.group || 'A',
      plane,
      points: [add(pivot, mul(axis, -span / 2)), add(pivot, mul(axis, span / 2))],
    });
    origin = add(pivot, mul(x, gap / 2));
    far = appendPanel(index + 1);
  }
  return { panels, joints };
}

/**
 * Orthographic display projection. Yaw rotates the horizontal XY coordinates;
 * pitch is camera elevation above the horizontal plane. Screen Y grows down.
 * pitch=90 is a top view; pitch=0 looks across the plane. Increasing depth is
 * nearer the viewer, so drawing surfaces in ascending depth is back-to-front.
 */
export function projectPoint(point, { yaw = -30, pitch = 25, scale = 1, cx = 0, cy = 0 } = {}) {
  const y = yaw * Math.PI / 180;
  const p = pitch * Math.PI / 180;
  const horizontal = point[0] * Math.cos(y) - point[1] * Math.sin(y);
  const away = point[0] * Math.sin(y) + point[1] * Math.cos(y);
  const vertical = point[2] * Math.cos(p) - away * Math.sin(p);
  return {
    x: cx + horizontal * scale,
    y: cy - vertical * scale,
    depth: away * Math.cos(p) + point[2] * Math.sin(p),
  };
}
