import 'c/game.css'
// Configuration du jeu
        const gameConfig = {
            sunRadius: 1,
            minDistances: {
                mineral: 3,
                ice: 3,
                enemy: 4,
            },
            resourceDistribution: {
                mineral: 0.15,
                ice: 0.15,
                enemy: 0.05
            }
        };

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        const GRID_RADIUS = 10;
        const SUB_HEX_SIZE = 25;
        const HEX_WIDTH = SUB_HEX_SIZE * Math.sqrt(3);
        const HEX_HEIGHT = SUB_HEX_SIZE * 2;
        const HEX_VERT_SPACING = HEX_HEIGHT * 0.75;
        const HEX_HORIZ_SPACING = HEX_WIDTH;

        canvas.width = HEX_HORIZ_SPACING * (GRID_RADIUS * 2 + 1) * 1.2;
        canvas.height = HEX_VERT_SPACING * (GRID_RADIUS * 2 + 1) * 1.2;

        const COLORS = {
            background: '#000000',
            hexBorder: '#ffffff',
            hover: '#3a3a3a',
            sun: '#ffd700',
            mineral: '#0066cc',
            ice: '#8B4513',
            enemy: '#cc0000',
            empty: '#2a2a2a'
        };

        class ResourceDistributor {
            constructor(gridRadius) {
                this.gridRadius = gridRadius;
                this.sunRadius = gameConfig.sunRadius;
                this.minDistances = gameConfig.minDistances;
            }

            getHexDistance(hex1, hex2) {
                return Math.max(
                    Math.abs(hex1.q - hex2.q),
                    Math.abs(hex1.r - hex2.r),
                    Math.abs((-hex1.q - hex1.r) - (-hex2.q - hex2.r))
                );
            }

            isTooClose(hex, placedResources, type) {
                for (const placed of placedResources) {
                    const minDist = placed.type === type ? 
                        this.minDistances[type] : 
                        this.minDistances.mixed;

                    if (this.getHexDistance(hex, placed) < minDist) {
                        return true;
                    }
                }
                return false;
            }

            distributeResources(hexagons) {
                // Marquer d'abord le soleil au centre
                const centerHexes = hexagons.filter(hex => 
                    this.getHexDistance({ q: 0, r: 0, s: 0 }, hex) <= this.sunRadius
                );
                centerHexes.forEach(hex => hex.type = 'sun');

                const placedResources = [];
                const availableHexes = hexagons.filter(hex => 
                    hex.type === 'empty' && 
                    this.getHexDistance({ q: 0, r: 0, s: 0 }, hex) > this.sunRadius
                );

                const targetCounts = {
                    mineral: Math.floor(availableHexes.length * gameConfig.resourceDistribution.mineral),
                    ice: Math.floor(availableHexes.length * gameConfig.resourceDistribution.ice),
                    enemy: Math.floor(availableHexes.length * gameConfig.resourceDistribution.enemy)
                };

                for (const [type, count] of Object.entries(targetCounts)) {
                    let placed = 0;
                    let attempts = 0;
                    const maxAttempts = availableHexes.length * 2;

                    while (placed < count && attempts < maxAttempts) {
                        const randomIndex = Math.floor(Math.random() * availableHexes.length);
                        const hex = availableHexes[randomIndex];

                        if (!this.isTooClose(hex, placedResources, type)) {
                            hex.type = type;
                            placedResources.push(hex);
                            availableHexes.splice(randomIndex, 1);
                            placed++;
                        }

                        attempts++;
                    }
                }

                return hexagons;
            }
        }

        let hoveredHex = null;
        let hexagons = [];
        const resourceDistributor = new ResourceDistributor(GRID_RADIUS);

        function drawHexagon(x, y, size, style = {}) {
            const { fillStyle = COLORS.buildable, strokeStyle = COLORS.hexBorder, lineWidth = 1, isHovered = false } = style;
            const angle = Math.PI / 3;

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const px = x + size * Math.cos(angle * i - Math.PI / 6);
                const py = y + size * Math.sin(angle * i - Math.PI / 6);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            ctx.fillStyle = isHovered ? COLORS.hover : fillStyle;
            ctx.fill();
            ctx.lineWidth = isHovered ? 2 : lineWidth;
            ctx.strokeStyle = strokeStyle;
            
            if (isHovered) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffffff';
            } else {
                ctx.shadowBlur = 0;
            }
            
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        function isInBigHexagon(q, r) {
            const s = -q - r;
            return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= GRID_RADIUS;
        }

        function generateGrid() {
            const positions = [];
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
                for (let r = -GRID_RADIUS; r <= GRID_RADIUS; r++) {
                    if (isInBigHexagon(q, r)) {
                        const x = centerX + (q * HEX_WIDTH + r * HEX_WIDTH / 2);
                        const y = centerY + (r * HEX_HEIGHT * 3/4);
                        
                        positions.push({
                            x: x,
                            y: y,
                            type: 'empty',
                            q: q,
                            r: r,
                            s: -q - r
                        });
                    }
                }
            }

            // Distribuer les ressources
            return resourceDistributor.distributeResources(positions);
        }

        function isPointInHexagon(px, py, hexX, hexY) {
            const dx = Math.abs(px - hexX);
            const dy = Math.abs(py - hexY);
            
            if (dx > HEX_WIDTH/2 || dy > HEX_HEIGHT/2) return false;
            return HEX_HEIGHT/4 * dx + HEX_WIDTH/2 * dy <= HEX_WIDTH * HEX_HEIGHT/4;
        }

        function findHoveredHexagon(mouseX, mouseY) {
            return hexagons.find(hex => isPointInHexagon(mouseX, mouseY, hex.x, hex.y));
        }

        function drawMap() {
            ctx.fillStyle = COLORS.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            hexagons.forEach(hex => {
                const fillColor = COLORS[hex.type];
                drawHexagon(hex.x, hex.y, SUB_HEX_SIZE, {
                    fillStyle: fillColor,
                    strokeStyle: COLORS.hexBorder,
                    isHovered: hex === hoveredHex
                });
            });
        }

        canvas.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            hoveredHex = findHoveredHexagon(x, y);
            drawMap();
        });

        canvas.addEventListener('mouseout', () => {
            hoveredHex = null;
            drawMap();
        });

        function regenerateMap() {
            hexagons = generateGrid();
            drawMap();
        }

        canvas.addEventListener('click', regenerateMap);
        regenerateMap();