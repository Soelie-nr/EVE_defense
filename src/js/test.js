import 'c/game.css'
// Definit la taille des hexagonnes
const GRID_RADIUS = 8;
const SUB_HEX_SIZE = 25;
const HEX_WIDTH = SUB_HEX_SIZE * Math.sqrt(3);
const HEX_HEIGHT = SUB_HEX_SIZE * 2;
// Definit les ressources a générer
const MAP_CONFIG = {
    sunRadius: 1,
    minDistances: { mineral: 5, ice: 5, enemy: 5 },
    resourceDistribution: { 
        mineral: 0.15, 
        ice: 0.15, 
        enemy: 0.05, 
        empty: 0.65 
    }
};
// Definit les couleurs des hexagones
const COLORS = {
    background: '#000000',
    hexBorder: '#ffffff',
    sun: '#ffd700',
    mineral: '#b3681e',
    ice: '#1c8cd0',
    enemy: '#cc0000'
};
// va faire un 1e dessin de la map
class ResourceDistributor {
    constructor(gridRadius) {
        this.gridRadius = gridRadius;
        this.sunRadius = MAP_CONFIG.sunRadius;
        this.minDistances = MAP_CONFIG.minDistances;
        this.validPositions = this.generateValidPositions();
    }
//Vérifie que les positions soient bonnes
    generateValidPositions() {
        const positions = [];
        for (let q = -this.gridRadius; q <= this.gridRadius; q++) {
            for (let r = -this.gridRadius; r <= this.gridRadius; r++) {
                if (this.isInBigHexagon(q, r)) {
                    positions.push({ q, r, s: -q - r });
                }
            }
        }
        return positions;
    }

    isInBigHexagon(q, r) {
        const s = -q - r;
        return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= this.gridRadius;
    }

    getHexDistance(hex1, hex2) {
        return Math.max(
            Math.abs(hex1.q - hex2.q),
            Math.abs(hex1.r - hex2.r),
            Math.abs(hex1.s - hex2.s)
        );
    }

    // Méthode ajoutée pour sélectionner des positions uniques aléatoirement
    getRandomUniquePositions(positions, count) {
        const result = [];
        const available = positions.slice(); // copie du tableau
        for (let i = 0; i < count; i++) {
            if (available.length === 0) break;
            const randomIndex = Math.floor(Math.random() * available.length);
            result.push(available[randomIndex]);
            available.splice(randomIndex, 1);
        }
        return result;
    }

    distributeResources(hexagons) {
        // On s'assure que chaque hexagone commence par 'empty'
        hexagons.forEach(hex => hex.type = 'empty');

        // Place le soleil sur les hexagones centraux
        hexagons.filter(hex => 
            this.getHexDistance({ q: 0, r: 0, s: 0 }, hex) <= this.sunRadius
        ).forEach(hex => hex.type = 'sun');

        // On détermine les positions disponibles pour les autres ressources
        const availablePositions = this.validPositions.filter(pos => 
            !hexagons.some(hex => 
                this.getHexDistance(pos, hex) < (this.minDistances[hex.type] || 0)
            )
        );

        const resourceTypes = ['mineral', 'ice', 'enemy'];
        resourceTypes.forEach(type => {
            const targetCount = Math.floor(availablePositions.length * MAP_CONFIG.resourceDistribution[type]);
            const selectedPositions = this.getRandomUniquePositions(availablePositions, targetCount);
            selectedPositions.forEach(pos => {
                const hex = hexagons.find(h => h.q === pos.q && h.r === pos.r);
                if (hex && hex.type === 'empty') {
                    hex.type = type;
                }
            });
        });

        return hexagons;
    }
}

class HexagonMap {
    constructor(canvasId, gridRadius) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridRadius = gridRadius;
        this.resourceDistributor = new ResourceDistributor(gridRadius);
        // Génère la grille, puis y applique la distribution des ressources
        this.hexagons = this.resourceDistributor.distributeResources(this.generateGrid());
        this.setupCanvas();
        this.renderMap();
    }

    generateGrid() {
        return this.resourceDistributor.validPositions.map(pos => ({
            x: pos.q * HEX_WIDTH + pos.r * HEX_WIDTH / 2,
            y: pos.r * HEX_HEIGHT * 3/4,
            type: 'empty',
            ...pos
        }));
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    renderMap() {
        this.ctx.fillStyle = COLORS.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.hexagons.forEach(hex => {
            // Centrer la grille dans le canvas
            this.drawHexagon(hex.x + this.canvas.width / 2, hex.y + this.canvas.height / 2, hex.type);
        });
    }
//Dessine les Hexagones 
    drawHexagon(x, y, type) {
        const ctx = this.ctx;
        const angle = Math.PI / 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const px = x + SUB_HEX_SIZE * Math.cos(angle * i - Math.PI / 6);
            const py = y + SUB_HEX_SIZE * Math.sin(angle * i - Math.PI / 6);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = COLORS[type] || COLORS.background;
        ctx.fill();
        ctx.strokeStyle = COLORS.hexBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Préchargement (ajoute un texte temporaire ou une erreur
document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        color: white;
        font-size: 2rem;
    `;
    loadingOverlay.textContent = 'Loading...';
    document.body.appendChild(loadingOverlay);

    setTimeout(() => {
        try {
            new HexagonMap('gameCanvas', GRID_RADIUS);
            document.body.removeChild(loadingOverlay);
        } catch (error) {
            loadingOverlay.textContent = 'Error loading game';
            loadingOverlay.style.color = 'red';
            console.error(error);
        }
    }, 100);
});
