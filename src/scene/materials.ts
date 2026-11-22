import * as THREE from 'three';
import type { BoardThemeId, PieceStyleId } from '../chess/types';
import { createMarbleTextures, createWoodTextures, type TexturePair } from './textures';

export interface ChessMaterialLibrary {
  lightSquare: THREE.MeshPhysicalMaterial;
  darkSquare: THREE.MeshPhysicalMaterial;
  boardFrame: THREE.MeshPhysicalMaterial;
  boardInlay: THREE.MeshStandardMaterial;
  whitePieceBody: THREE.MeshPhysicalMaterial;
  whitePieceAccent: THREE.MeshPhysicalMaterial;
  blackPieceBody: THREE.MeshPhysicalMaterial;
  blackPieceAccent: THREE.MeshPhysicalMaterial;
  feltBase: THREE.MeshStandardMaterial;
  tableTop: THREE.MeshStandardMaterial;
  applyTheme: (theme: BoardThemeId) => void;
  applyPieceStyle: (style: PieceStyleId) => void;
  dispose: () => void;
}

export function createMaterialLibrary(maxAnisotropy: number): ChessMaterialLibrary {
  const textures: Record<string, TexturePair> = {
    maple: createWoodTextures('#e8d3b0', '#c8a675', maxAnisotropy, 1.3),
    walnut: createWoodTextures('#5b3822', '#2f1a0e', maxAnisotropy, 4.7),
    ebonyFrame: createWoodTextures('#261a14', '#140c08', maxAnisotropy, 9.1),
    carrara: createMarbleTextures('#f1eee8', '#9ea3ad', maxAnisotropy, 2.1),
    nero: createMarbleTextures('#1f2228', '#c8aa6e', maxAnisotropy, 6.4),
    slate: createMarbleTextures('#2a2e35', '#17191d', maxAnisotropy, 3.8),
    travertine: createMarbleTextures('#cfc3ae', '#9c8c72', maxAnisotropy, 8.2),
  };

  const lightSquare = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.maple.map,
    bumpMap: textures.maple.bumpMap,
    bumpScale: 0.008,
    roughness: 0.34,
    metalness: 0.02,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
  });

  const darkSquare = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.walnut.map,
    bumpMap: textures.walnut.bumpMap,
    bumpScale: 0.01,
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
  });

  const boardFrame = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.ebonyFrame.map,
    bumpMap: textures.ebonyFrame.bumpMap,
    bumpScale: 0.012,
    roughness: 0.42,
    metalness: 0.04,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  });

  const boardInlay = new THREE.MeshStandardMaterial({
    color: 0xc9a45c,
    roughness: 0.25,
    metalness: 0.88,
  });

  const whitePieceBody = new THREE.MeshPhysicalMaterial({
    color: 0xf5eedf,
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 0.55,
    clearcoatRoughness: 0.2,
  });

  const whitePieceAccent = new THREE.MeshPhysicalMaterial({
    color: 0xd4af37,
    roughness: 0.24,
    metalness: 0.86,
    clearcoat: 0.35,
  });

  const blackPieceBody = new THREE.MeshPhysicalMaterial({
    color: 0x1a1c21,
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 0.72,
    clearcoatRoughness: 0.14,
  });

  const blackPieceAccent = new THREE.MeshPhysicalMaterial({
    color: 0xb89448,
    roughness: 0.26,
    metalness: 0.85,
    clearcoat: 0.35,
  });

  // High roughness contrast (>= 0.25 difference from piece body)
  const feltBase = new THREE.MeshStandardMaterial({
    color: 0x183828,
    roughness: 0.92,
    metalness: 0.0,
  });

  const tableTop = new THREE.MeshStandardMaterial({
    color: 0x18191e,
    roughness: 0.78,
    metalness: 0.06,
  });

  const applyTheme = (theme: BoardThemeId) => {
    if (theme === 'walnut') {
      lightSquare.color.setHex(0xffffff);
      lightSquare.map = textures.maple.map;
      lightSquare.bumpMap = textures.maple.bumpMap;
      lightSquare.roughness = 0.34;
      lightSquare.clearcoat = 0.45;

      darkSquare.color.setHex(0xffffff);
      darkSquare.map = textures.walnut.map;
      darkSquare.bumpMap = textures.walnut.bumpMap;
      darkSquare.roughness = 0.38;
      darkSquare.clearcoat = 0.4;

      boardFrame.color.setHex(0xffffff);
      boardFrame.map = textures.ebonyFrame.map;
      boardFrame.bumpMap = textures.ebonyFrame.bumpMap;
      boardFrame.roughness = 0.42;

      boardInlay.color.setHex(0xc9a45c);
      feltBase.color.setHex(0x183a29);
    } else if (theme === 'marble') {
      lightSquare.color.setHex(0xffffff);
      lightSquare.map = textures.carrara.map;
      lightSquare.bumpMap = textures.carrara.bumpMap;
      lightSquare.roughness = 0.16;
      lightSquare.clearcoat = 0.85;

      darkSquare.color.setHex(0xffffff);
      darkSquare.map = textures.nero.map;
      darkSquare.bumpMap = textures.nero.bumpMap;
      darkSquare.roughness = 0.18;
      darkSquare.clearcoat = 0.88;

      boardFrame.color.setHex(0xffffff);
      boardFrame.map = textures.nero.map;
      boardFrame.bumpMap = textures.nero.bumpMap;
      boardFrame.roughness = 0.22;

      boardInlay.color.setHex(0xdec07c);
      feltBase.color.setHex(0x2d1820);
    } else {
      // obsidian
      lightSquare.color.setHex(0xffffff);
      lightSquare.map = textures.travertine.map;
      lightSquare.bumpMap = textures.travertine.bumpMap;
      lightSquare.roughness = 0.42;
      lightSquare.clearcoat = 0.22;

      darkSquare.color.setHex(0xffffff);
      darkSquare.map = textures.slate.map;
      darkSquare.bumpMap = textures.slate.bumpMap;
      darkSquare.roughness = 0.36;
      darkSquare.clearcoat = 0.3;

      boardFrame.color.setHex(0x16171c);
      boardFrame.map = null;
      boardFrame.bumpMap = textures.slate.bumpMap;
      boardFrame.roughness = 0.35;

      boardInlay.color.setHex(0xd4af37);
      feltBase.color.setHex(0x1c212b);
    }

    lightSquare.needsUpdate = true;
    darkSquare.needsUpdate = true;
    boardFrame.needsUpdate = true;
  };

  const applyPieceStyle = (style: PieceStyleId) => {
    if (style === 'staunton') {
      whitePieceBody.color.setHex(0xf5eedf);
      whitePieceBody.map = null;
      whitePieceBody.roughness = 0.24;
      whitePieceBody.metalness = 0.03;
      whitePieceBody.clearcoat = 0.52;

      whitePieceAccent.color.setHex(0xe5d6b8);
      whitePieceAccent.roughness = 0.42;
      whitePieceAccent.metalness = 0.12;

      blackPieceBody.color.setHex(0x191b20);
      blackPieceBody.map = null;
      blackPieceBody.roughness = 0.16;
      blackPieceBody.metalness = 0.06;
      blackPieceBody.clearcoat = 0.72;

      blackPieceAccent.color.setHex(0x3a3228);
      blackPieceAccent.roughness = 0.38;
      blackPieceAccent.metalness = 0.18;
    } else if (style === 'imperial') {
      whitePieceBody.color.setHex(0xffffff);
      whitePieceBody.map = textures.carrara.map;
      whitePieceBody.roughness = 0.15;
      whitePieceBody.metalness = 0.05;
      whitePieceBody.clearcoat = 0.85;

      whitePieceAccent.color.setHex(0xd8b24c);
      whitePieceAccent.roughness = 0.22;
      whitePieceAccent.metalness = 0.9;

      blackPieceBody.color.setHex(0xffffff);
      blackPieceBody.map = textures.nero.map;
      blackPieceBody.roughness = 0.14;
      blackPieceBody.metalness = 0.08;
      blackPieceBody.clearcoat = 0.88;

      blackPieceAccent.color.setHex(0xc99c38);
      blackPieceAccent.roughness = 0.24;
      blackPieceAccent.metalness = 0.88;
    } else {
      // minimalist architectural titanium & anodized charcoal
      whitePieceBody.color.setHex(0xdcd9d0);
      whitePieceBody.map = null;
      whitePieceBody.roughness = 0.28;
      whitePieceBody.metalness = 0.68;
      whitePieceBody.clearcoat = 0.18;

      whitePieceAccent.color.setHex(0x9ca3af);
      whitePieceAccent.roughness = 0.18;
      whitePieceAccent.metalness = 0.92;

      blackPieceBody.color.setHex(0x232730);
      blackPieceBody.map = null;
      blackPieceBody.roughness = 0.26;
      blackPieceBody.metalness = 0.72;
      blackPieceBody.clearcoat = 0.22;

      blackPieceAccent.color.setHex(0xd4af37);
      blackPieceAccent.roughness = 0.2;
      blackPieceAccent.metalness = 0.92;
    }

    whitePieceBody.needsUpdate = true;
    whitePieceAccent.needsUpdate = true;
    blackPieceBody.needsUpdate = true;
    blackPieceAccent.needsUpdate = true;
  };

  const dispose = () => {
    Object.values(textures).forEach((pair) => {
      pair.map.dispose();
      pair.bumpMap.dispose();
    });
    lightSquare.dispose();
    darkSquare.dispose();
    boardFrame.dispose();
    boardInlay.dispose();
    whitePieceBody.dispose();
    whitePieceAccent.dispose();
    blackPieceBody.dispose();
    blackPieceAccent.dispose();
    feltBase.dispose();
    tableTop.dispose();
  };

  return {
    lightSquare,
    darkSquare,
    boardFrame,
    boardInlay,
    whitePieceBody,
    whitePieceAccent,
    blackPieceBody,
    blackPieceAccent,
    feltBase,
    tableTop,
    applyTheme,
    applyPieceStyle,
    dispose,
  };
}
