import * as THREE from 'three';
import type { PieceColor, PieceStyleId, PieceType } from '../chess/types';
import type { ChessMaterialLibrary } from './materials';

function latheFromProfile(points: Array<[number, number]>, segments: number): THREE.LatheGeometry {
  const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.computeVertexNormals();
  return geo;
}

function createCrossGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const w = 0.036;
  const h = 0.13;
  const arm = 0.082;
  const yMid = 0.078;

  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, yMid - w * 0.75);
  shape.lineTo(arm, yMid - w * 0.75);
  shape.lineTo(arm, yMid + w * 0.75);
  shape.lineTo(w, yMid + w * 0.75);
  shape.lineTo(w, h);
  shape.lineTo(-w, h);
  shape.lineTo(-w, yMid + w * 0.75);
  shape.lineTo(-arm, yMid + w * 0.75);
  shape.lineTo(-arm, yMid - w * 0.75);
  shape.lineTo(-w, yMid - w * 0.75);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.02);
  geo.computeVertexNormals();
  return geo;
}

function createKnightHeadGeometry(): THREE.ExtrudeGeometry {
  // Sculpted stallion profile facing +Z when rotated around Y
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, 0);
  shape.lineTo(0.14, 0);
  shape.quadraticCurveTo(0.15, 0.14, 0.09, 0.25); // chest
  shape.quadraticCurveTo(0.18, 0.29, 0.22, 0.28); // jaw
  shape.lineTo(0.24, 0.34); // muzzle tip
  shape.quadraticCurveTo(0.17, 0.42, 0.07, 0.46); // bridge of nose
  shape.lineTo(0.05, 0.56); // front ear
  shape.lineTo(0.0, 0.50);
  shape.lineTo(-0.04, 0.57); // back ear
  shape.quadraticCurveTo(-0.14, 0.46, -0.17, 0.30); // mane top
  shape.quadraticCurveTo(-0.19, 0.14, -0.15, 0); // lower neck
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.025,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.07);
  // Rotate so muzzle faces +Z (towards opponent for White)
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export interface PieceGeometryCache {
  getPieceMesh: (type: PieceType, color: PieceColor, style: PieceStyleId) => THREE.Group;
  dispose: () => void;
}

export function createPieceGeometryCache(materials: ChessMaterialLibrary): PieceGeometryCache {
  const disposableGeos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };

  // Shared felt & collar primitives across styles
  const feltGeo = track(new THREE.CylinderGeometry(0.32, 0.33, 0.025, 24));
  const smallFeltGeo = track(new THREE.CylinderGeometry(0.27, 0.28, 0.025, 24));

  // Classic Staunton Lathe profiles (smooth 24 radial segments)
  const pawnBodyGeo = track(
    latheFromProfile(
      [
        [0.0, 0.025],
        [0.27, 0.025],
        [0.27, 0.075],
        [0.23, 0.10],
        [0.22, 0.14],
        [0.145, 0.22],
        [0.105, 0.38],
        [0.092, 0.47],
        [0.145, 0.50],
        [0.095, 0.53],
        [0.0, 0.53],
      ],
      24
    )
  );
  const pawnHeadGeo = track(new THREE.SphereGeometry(0.135, 22, 16));
  const pawnCollarGeo = track(new THREE.TorusGeometry(0.115, 0.022, 10, 24));
  pawnCollarGeo.rotateX(Math.PI / 2);

  const rookBaseGeo = track(
    latheFromProfile(
      [
        [0.0, 0.025],
        [0.31, 0.025],
        [0.31, 0.08],
        [0.26, 0.12],
        [0.24, 0.17],
        [0.18, 0.24],
        [0.16, 0.54],
        [0.21, 0.59],
        [0.23, 0.65],
        [0.23, 0.72],
        [0.15, 0.72],
        [0.15, 0.65],
        [0.0, 0.65],
      ],
      24
    )
  );
  const rookMerlonGeo = track(new THREE.BoxGeometry(0.095, 0.10, 0.095));
  const rookCollarGeo = track(new THREE.TorusGeometry(0.185, 0.024, 10, 24));
  rookCollarGeo.rotateX(Math.PI / 2);

  const knightBaseGeo = track(
    latheFromProfile(
      [
        [0.0, 0.025],
        [0.31, 0.025],
        [0.31, 0.08],
        [0.25, 0.13],
        [0.24, 0.19],
        [0.18, 0.24],
        [0.0, 0.24],
      ],
      24
    )
  );
  const knightHeadGeo = track(createKnightHeadGeometry());
  const knightCollarGeo = track(new THREE.TorusGeometry(0.195, 0.024, 10, 24));
  knightCollarGeo.rotateX(Math.PI / 2);
  const knightBridleGeo = track(new THREE.BoxGeometry(0.19, 0.045, 0.08));

  const bishopBodyGeo = track(
    latheFromProfile(
      [
        [0.0, 0.025],
        [0.30, 0.025],
        [0.30, 0.08],
        [0.25, 0.12],
        [0.23, 0.17],
        [0.15, 0.27],
        [0.11, 0.52],
        [0.16, 0.57],
        [0.11, 0.60],
        [0.155, 0.69],
        [0.13, 0.80],
        [0.055, 0.89],
        [0.0, 0.90],
      ],
      24
    )
  );
  const bishopFinialGeo = track(new THREE.SphereGeometry(0.052, 16, 12));
  const bishopCollarGeo = track(new THREE.TorusGeometry(0.145, 0.023, 10, 24));
  bishopCollarGeo.rotateX(Math.PI / 2);
  const bishopMitreBandGeo = track(new THREE.BoxGeometry(0.032, 0.16, 0.24));

  const queenBodyGeo = track(
    latheFromProfile(
      [
        [0.0, 0.025],
        [0.33, 0.025],
        [0.33, 0.085],
        [0.27, 0.13],
        [0.25, 0.19],
        [0.16, 0.30],
        [0.12, 0.62],
        [0.18, 0.68],
        [0.125, 0.72],
        [0.195, 0.88],
        [0.17, 0.95],
        [0.10, 0.98],
        [0.0, 0.98],
      ],
      24
    )
  );
  const queenCollarGeo = track(new THREE.TorusGeometry(0.17, 0.025, 10, 24));
  queenCollarGeo.rotateX(Math.PI / 2);
  const queenSpikeGeo = track(new THREE.ConeGeometry(0.038, 0.12, 8));
  const queenOrbGeo = track(new THREE.SphereGeometry(0.068, 18, 14));

  const kingBodyGeo = track(
    latheFromProfile(
      [
        [0.0, 0.025],
        [0.34, 0.025],
        [0.34, 0.09],
        [0.28, 0.14],
        [0.26, 0.20],
        [0.17, 0.33],
        [0.13, 0.69],
        [0.195, 0.76],
        [0.135, 0.80],
        [0.205, 0.98],
        [0.15, 1.04],
        [0.0, 1.04],
      ],
      24
    )
  );
  const kingCollarGeo = track(new THREE.TorusGeometry(0.185, 0.027, 10, 24));
  kingCollarGeo.rotateX(Math.PI / 2);
  const kingCrossGeo = track(createCrossGeometry());

  // Minimalist / Bauhaus architectural geometries (faceted 8-sided pedestals & crisp geometric heads)
  const minBaseGeo = track(new THREE.CylinderGeometry(0.27, 0.31, 0.11, 8));
  const minShaftGeo = track(new THREE.CylinderGeometry(0.11, 0.21, 0.45, 8));
  const minTallShaftGeo = track(new THREE.CylinderGeometry(0.12, 0.22, 0.66, 8));
  const minRingGeo = track(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 8));
  const minPawnTopGeo = track(new THREE.OctahedronGeometry(0.13, 0));
  const minRookTopGeo = track(new THREE.BoxGeometry(0.26, 0.22, 0.26));
  const minBishopTopGeo = track(new THREE.ConeGeometry(0.16, 0.34, 4));
  const minQueenTopGeo = track(new THREE.CylinderGeometry(0.22, 0.12, 0.22, 8));
  const minKingTopGeo = track(new THREE.BoxGeometry(0.24, 0.24, 0.24));

  const getPieceMesh = (type: PieceType, color: PieceColor, style: PieceStyleId): THREE.Group => {
    const group = new THREE.Group();
    const bodyMat = color === 'w' ? materials.whitePieceBody : materials.blackPieceBody;
    const accentMat = color === 'w' ? materials.whitePieceAccent : materials.blackPieceAccent;
    const feltMat = materials.feltBase;

    const addPart = (geo: THREE.BufferGeometry, mat: THREE.Material, y = 0, x = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
      return m;
    };

    // Weighted felt pad under every piece
    addPart(type === 'p' ? smallFeltGeo : feltGeo, feltMat, 0.0125);

    if (style === 'minimalist') {
      // Sleek architectural geometric style (3–6 parts per piece)
      addPart(minBaseGeo, bodyMat, 0.08);
      const isTall = type === 'k' || type === 'q' || type === 'b';
      addPart(isTall ? minTallShaftGeo : minShaftGeo, bodyMat, isTall ? 0.44 : 0.34);
      addPart(minRingGeo, accentMat, isTall ? 0.78 : 0.56);

      if (type === 'p') {
        addPart(minPawnTopGeo, bodyMat, 0.68);
      } else if (type === 'r') {
        addPart(minRookTopGeo, bodyMat, 0.68);
        addPart(minRingGeo, accentMat, 0.80);
      } else if (type === 'n') {
        const head = addPart(knightHeadGeo, bodyMat, 0.56);
        head.scale.set(0.85, 0.85, 0.85);
        if (color === 'b') head.rotation.y = Math.PI;
      } else if (type === 'b') {
        const cone = addPart(minBishopTopGeo, bodyMat, 0.96);
        cone.rotation.y = Math.PI / 4;
      } else if (type === 'q') {
        addPart(minQueenTopGeo, bodyMat, 0.90);
        addPart(queenOrbGeo, accentMat, 1.05);
      } else if (type === 'k') {
        const crown = addPart(minKingTopGeo, bodyMat, 0.91);
        crown.rotation.y = Math.PI / 4;
        addPart(kingCrossGeo, accentMat, 1.03);
      }
      return group;
    }

    // Staunton & Imperial styles (sculpted Lathe + beveled Extrude composite groups)
    if (type === 'p') {
      addPart(pawnBodyGeo, bodyMat, 0);
      addPart(pawnCollarGeo, accentMat, 0.50);
      addPart(pawnHeadGeo, bodyMat, 0.64);
    } else if (type === 'r') {
      addPart(rookBaseGeo, bodyMat, 0);
      addPart(rookCollarGeo, accentMat, 0.59);
      // 6 crenellations around parapet
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const merlon = addPart(rookMerlonGeo, bodyMat, 0.76, Math.cos(angle) * 0.175, Math.sin(angle) * 0.175);
        merlon.rotation.y = -angle;
      }
    } else if (type === 'n') {
      addPart(knightBaseGeo, bodyMat, 0);
      addPart(knightCollarGeo, accentMat, 0.24);
      const head = addPart(knightHeadGeo, bodyMat, 0.23);
      const bridle = addPart(knightBridleGeo, accentMat, 0.50, 0, color === 'w' ? 0.13 : -0.13);
      if (color === 'b') {
        head.rotation.y = Math.PI;
        bridle.rotation.y = Math.PI;
      }
    } else if (type === 'b') {
      addPart(bishopBodyGeo, bodyMat, 0);
      addPart(bishopCollarGeo, accentMat, 0.57);
      const band = addPart(bishopMitreBandGeo, accentMat, 0.74);
      band.rotation.x = 0.35;
      addPart(bishopFinialGeo, accentMat, 0.93);
    } else if (type === 'q') {
      addPart(queenBodyGeo, bodyMat, 0);
      addPart(queenCollarGeo, accentMat, 0.68);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        addPart(queenSpikeGeo, accentMat, 1.00, Math.cos(angle) * 0.155, Math.sin(angle) * 0.155);
      }
      addPart(queenOrbGeo, accentMat, 1.03);
    } else if (type === 'k') {
      addPart(kingBodyGeo, bodyMat, 0);
      addPart(kingCollarGeo, accentMat, 0.76);
      addPart(kingCrossGeo, accentMat, 1.03);
    }

    return group;
  };

  const dispose = () => {
    disposableGeos.forEach((g) => g.dispose());
  };

  return {
    getPieceMesh,
    dispose,
  };
}
