// BunnyIsland Game Logic
class BunnyIslandGame {
    constructor() {
        this.gameState = {
            level: 1,
            totalCarrots: 0,
            carrotsInCurrentLevel: 0,
            bunnies: [
                { id: 1, type: 'bridal', name: 'Bridal Bunny', unlocked: true }
            ],
            furniture: [], // Furniture available to place in castle
            mergeGrid: Array(25).fill(null), // 5x5 grid
            currentRoom: 0,
            rooms: [
                { id: 0, name: 'Living Room', unlocked: true, furniture: [] },
                { id: 1, name: 'Bedroom', unlocked: false, unlockLevel: 20, furniture: [] },
                { id: 2, name: 'Kitchen', unlocked: false, unlockLevel: 40, furniture: [] },
                { id: 3, name: 'Garden', unlocked: false, unlockLevel: 60, furniture: [] },
            ]
        };

        this.carrotSpawnInterval = null;
        this.currentScreen = 'main-menu';
        this.draggedItem = null;
        this.dragSource = null;
        this.placingFurniture = null;

        // Furniture merge rules - thematic combinations
        this.furnitureMergeRules = {
            'lamp-lamp': { result: 'chandelier', name: 'Chandelier' },
            'drawer-drawer': { result: 'wardrobe', name: 'Wardrobe' },
            'chair-chair': { result: 'sofa', name: 'Sofa' },
            'table-table': { result: 'dining-table', name: 'Dining Table' },
            'bed-bed': { result: 'king-bed', name: 'King Bed' },
            'plant-plant': { result: 'tree', name: 'Tree' },
            'lamp-drawer': { result: 'lit-drawer', name: 'Lit Drawer' },
            'drawer-lamp': { result: 'lit-drawer', name: 'Lit Drawer' },
        };

        this.init();
    }

    init() {
        this.loadGame();
        this.setupEventListeners();
        this.updateUI();
        this.initMergeGrid();
        this.checkRoomUnlocks();
    }

    setupEventListeners() {
        // Main menu buttons
        document.getElementById('btn-carrot-world').addEventListener('click', () => {
            this.switchScreen('carrot-world');
            this.startCarrotGame();
        });

        document.getElementById('btn-castle').addEventListener('click', () => {
            this.switchScreen('castle');
            this.updateCastle();
        });

        document.getElementById('btn-merge').addEventListener('click', () => {
            this.switchScreen('merge-board');
        });

        // Back buttons
        document.querySelectorAll('.back-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetScreen = e.target.getAttribute('data-back');
                this.switchScreen(targetScreen);
                if (this.carrotSpawnInterval) {
                    clearInterval(this.carrotSpawnInterval);
                }
            });
        });

        // Castle controls
        document.getElementById('toggle-day-night').addEventListener('click', (e) => {
            const room = document.getElementById('castle-room');
            room.classList.toggle('night');
            e.target.textContent = room.classList.contains('night') ? '☀️ Day' : '🌙 Night';
        });

        // Room navigation
        document.getElementById('prev-room').addEventListener('click', () => {
            this.changeRoom(-1);
        });

        document.getElementById('next-room').addEventListener('click', () => {
            this.changeRoom(1);
        });

        // Place furniture button
        document.getElementById('place-furniture-btn').addEventListener('click', () => {
            this.toggleFurnitureInventory();
        });

        // Furniture selection
        document.querySelectorAll('.furniture-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const furnitureType = button.getAttribute('data-furniture');
                const level = parseInt(button.getAttribute('data-level'));
                this.addFurnitureToGrid(furnitureType, level);
            });
        });
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    // Room Management
    changeRoom(direction) {
        const newRoomIndex = this.gameState.currentRoom + direction;
        if (newRoomIndex >= 0 && newRoomIndex < this.gameState.rooms.length) {
            const newRoom = this.gameState.rooms[newRoomIndex];
            if (newRoom.unlocked) {
                this.gameState.currentRoom = newRoomIndex;
                this.updateCastle();
                this.saveGame();
            } else {
                this.showNotification(`Unlock at Level ${newRoom.unlockLevel}!`);
            }
        }
    }

    checkRoomUnlocks() {
        this.gameState.rooms.forEach(room => {
            if (!room.unlocked && this.gameState.level >= room.unlockLevel) {
                room.unlocked = true;
                this.showNotification(`🎉 ${room.name} Unlocked! 🎉`);
            }
        });
    }

    toggleFurnitureInventory() {
        const inventory = document.getElementById('furniture-inventory');
        inventory.style.display = inventory.style.display === 'none' ? 'block' : 'block';
        this.updateFurnitureInventory();
    }

    updateFurnitureInventory() {
        const container = document.getElementById('available-furniture');
        container.innerHTML = '';

        this.gameState.furniture.forEach((furniture, index) => {
            const item = document.createElement('div');
            item.className = 'inventory-furniture-item';
            item.draggable = true;
            item.dataset.furnitureIndex = index;

            item.innerHTML = `
                <div class="furniture-visual ${furniture.type}-visual"></div>
                <div class="furniture-level">${furniture.level}</div>
            `;

            // Drag events for inventory items
            item.addEventListener('dragstart', (e) => {
                this.draggedItem = furniture;
                this.dragSource = 'inventory';
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
            });

            container.appendChild(item);
        });
    }

    // Carrot Collection Game
    startCarrotGame() {
        const gameArea = document.getElementById('carrot-game-area');
        gameArea.innerHTML = ''; // Clear existing carrots

        // Spawn carrots periodically
        this.spawnCarrots();
        this.carrotSpawnInterval = setInterval(() => {
            this.spawnCarrots();
        }, 2000);
    }

    spawnCarrots() {
        const gameArea = document.getElementById('carrot-game-area');
        const existingCarrots = gameArea.querySelectorAll('.carrot').length;

        // Keep 5-8 carrots on screen
        if (existingCarrots < 8) {
            const numberOfCarrots = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numberOfCarrots; i++) {
                this.createCarrot();
            }
        }
    }

    createCarrot() {
        const gameArea = document.getElementById('carrot-game-area');
        const carrot = document.createElement('div');
        carrot.className = 'carrot';

        // Determine carrot type
        const rand = Math.random();
        let carrotIcon = '🥕';
        let carrotValue = 1;

        if (rand > 0.95) {
            // Rainbow carrot - CSS will make it rainbow colored
            carrotValue = 5;
            carrot.classList.add('rainbow');
        } else if (rand > 0.85) {
            // Golden carrot - CSS will make it golden colored
            carrotValue = 3;
            carrot.classList.add('golden');
        }

        carrot.textContent = carrotIcon;
        carrot.dataset.value = carrotValue;

        // Random position
        const maxX = gameArea.clientWidth - 60;
        const maxY = gameArea.clientHeight - 60;
        carrot.style.left = Math.random() * maxX + 'px';
        carrot.style.top = Math.random() * maxY + 'px';

        carrot.addEventListener('click', (e) => {
            this.collectCarrot(e.target);
        });

        gameArea.appendChild(carrot);
    }

    collectCarrot(carrotElement) {
        const value = parseInt(carrotElement.dataset.value);

        // Animate collection
        carrotElement.classList.add('carrot-collect-animation');

        setTimeout(() => {
            carrotElement.remove();
        }, 500);

        // Update game state
        this.gameState.totalCarrots += value;
        this.gameState.carrotsInCurrentLevel += value;

        // Check for level up
        if (this.gameState.carrotsInCurrentLevel >= 10) {
            this.levelUp();
        }

        this.updateUI();
        this.saveGame();
    }

    levelUp() {
        this.gameState.carrotsInCurrentLevel -= 10;
        this.gameState.level++;

        // Show level up notification
        this.showNotification(`🎉 Level ${this.gameState.level}! 🎉`);

        // Check for room unlocks
        this.checkRoomUnlocks();

        // Unlock new bunny every 10 levels
        if (this.gameState.level % 10 === 0) {
            this.unlockNewBunny();
        }

        this.updateUI();
        this.saveGame();
    }

    unlockNewBunny() {
        const bunnyTypes = [
            { type: 'chef', name: 'Chef Bunny' },
            { type: 'astronaut', name: 'Astronaut Bunny' },
            { type: 'pirate', name: 'Pirate Bunny' },
            { type: 'ninja', name: 'Ninja Bunny' },
            { type: 'wizard', name: 'Wizard Bunny' },
            { type: 'knight', name: 'Knight Bunny' },
            { type: 'doctor', name: 'Doctor Bunny' },
            { type: 'artist', name: 'Artist Bunny' },
        ];

        const bunnyIndex = Math.floor(this.gameState.level / 10) - 1;
        if (bunnyIndex < bunnyTypes.length) {
            const newBunny = bunnyTypes[bunnyIndex];
            this.gameState.bunnies.push({
                id: this.gameState.bunnies.length + 1,
                ...newBunny,
                unlocked: true
            });
            this.showNotification(`🐰 New Bunny Unlocked: ${newBunny.name}! 🐰`);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Merge System
    initMergeGrid() {
        const grid = document.getElementById('merge-grid');
        grid.innerHTML = '';

        for (let i = 0; i < 25; i++) {
            const cell = document.createElement('div');
            cell.className = 'merge-cell';
            cell.dataset.index = i;

            // Drag and drop events
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                cell.classList.add('drag-over');
            });

            cell.addEventListener('dragleave', (e) => {
                cell.classList.remove('drag-over');
            });

            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drag-over');
                this.handleDrop(i);
            });

            cell.addEventListener('click', () => {
                this.onCellClick(i);
            });

            grid.appendChild(cell);
        }
    }

    addFurnitureToGrid(type, level) {
        // Find first empty cell
        const emptyIndex = this.gameState.mergeGrid.findIndex(cell => cell === null);
        if (emptyIndex === -1) {
            alert('Grid is full! Merge some items first.');
            return;
        }

        const furniture = {
            type: type,
            level: level,
            name: this.getFurnitureName(type, level)
        };

        this.gameState.mergeGrid[emptyIndex] = furniture;
        this.renderMergeGrid();
        this.saveGame();
    }

    getFurnitureName(type, level) {
        const baseNames = {
            'lamp': 'Lamp',
            'drawer': 'Drawer',
            'chair': 'Chair',
            'table': 'Table',
            'bed': 'Bed',
            'plant': 'Plant',
            'chandelier': 'Chandelier',
            'wardrobe': 'Wardrobe',
            'sofa': 'Sofa',
            'dining-table': 'Dining Table',
            'king-bed': 'King Bed',
            'tree': 'Tree',
            'lit-drawer': 'Lit Drawer'
        };

        return baseNames[type] || 'Furniture';
    }

    selectedCell = null;
    draggedFromCell = null;

    handleDrop(targetIndex) {
        if (this.dragSource === 'merge-grid' && this.draggedFromCell !== null) {
            // Moving within grid
            const sourceIndex = this.draggedFromCell;
            if (targetIndex !== sourceIndex) {
                const targetCell = this.gameState.mergeGrid[targetIndex];

                if (targetCell === null) {
                    // Move to empty cell
                    this.gameState.mergeGrid[targetIndex] = this.gameState.mergeGrid[sourceIndex];
                    this.gameState.mergeGrid[sourceIndex] = null;
                } else {
                    // Try to merge
                    this.attemptMerge(sourceIndex, targetIndex);
                }
            }
        }

        this.draggedFromCell = null;
        this.dragSource = null;
        this.renderMergeGrid();
        this.saveGame();
    }

    onCellClick(index) {
        const cell = this.gameState.mergeGrid[index];

        if (this.selectedCell === null) {
            // First selection
            if (cell !== null) {
                this.selectedCell = index;
                this.highlightCell(index);
            }
        } else {
            // Second selection - try to merge or move
            if (index === this.selectedCell) {
                // Deselect
                this.selectedCell = null;
                this.renderMergeGrid();
            } else if (cell !== null) {
                // Try to merge
                this.attemptMerge(this.selectedCell, index);
                this.selectedCell = null;
            } else {
                // Move to empty cell
                this.gameState.mergeGrid[index] = this.gameState.mergeGrid[this.selectedCell];
                this.gameState.mergeGrid[this.selectedCell] = null;
                this.selectedCell = null;
                this.renderMergeGrid();
            }
        }
    }

    highlightCell(index) {
        this.renderMergeGrid();
        const grid = document.getElementById('merge-grid');
        const cells = grid.querySelectorAll('.merge-cell');
        cells[index].style.border = '3px solid #e17055';
        cells[index].style.transform = 'scale(1.1)';
    }

    attemptMerge(index1, index2) {
        const item1 = this.gameState.mergeGrid[index1];
        const item2 = this.gameState.mergeGrid[index2];

        // Items must be same level to merge
        if (item1.level !== item2.level) {
            alert('Items must be the same level to merge!');
            this.renderMergeGrid();
            return;
        }

        // Check for thematic merge
        const mergeKey1 = `${item1.type}-${item2.type}`;
        const mergeKey2 = `${item2.type}-${item1.type}`;

        let mergedItem;

        if (this.furnitureMergeRules[mergeKey1]) {
            const rule = this.furnitureMergeRules[mergeKey1];
            mergedItem = {
                type: rule.result,
                level: item1.level + 1,
                name: rule.name
            };
        } else if (this.furnitureMergeRules[mergeKey2]) {
            const rule = this.furnitureMergeRules[mergeKey2];
            mergedItem = {
                type: rule.result,
                level: item1.level + 1,
                name: rule.name
            };
        } else {
            // Same type merge - just level up
            mergedItem = {
                type: item1.type,
                level: item1.level + 1,
                name: `${item1.name} Lv${item1.level + 1}`
            };
        }

        // Perform merge
        this.gameState.mergeGrid[index1] = mergedItem;
        this.gameState.mergeGrid[index2] = null;

        // Add merged furniture to available furniture list
        this.gameState.furniture.push(mergedItem);

        this.renderMergeGrid();
        this.saveGame();

        // Show merge animation
        setTimeout(() => {
            const grid = document.getElementById('merge-grid');
            const cells = grid.querySelectorAll('.merge-cell');
            cells[index1].querySelector('.furniture-item')?.classList.add('merging');
        }, 50);
    }

    renderMergeGrid() {
        const grid = document.getElementById('merge-grid');
        const cells = grid.querySelectorAll('.merge-cell');

        cells.forEach((cell, index) => {
            const furniture = this.gameState.mergeGrid[index];
            cell.innerHTML = '';
            cell.classList.remove('occupied');
            cell.style.border = '';
            cell.style.transform = '';

            if (furniture) {
                cell.classList.add('occupied');
                const item = document.createElement('div');
                item.className = 'furniture-item';
                item.draggable = true;

                item.innerHTML = `
                    <div class="furniture-visual ${furniture.type}-visual"></div>
                    <div class="furniture-level">${furniture.level}</div>
                `;

                // Drag events for grid items
                item.addEventListener('dragstart', (e) => {
                    this.draggedFromCell = index;
                    this.dragSource = 'merge-grid';
                    e.dataTransfer.effectAllowed = 'move';
                    item.classList.add('dragging');
                });

                item.addEventListener('dragend', (e) => {
                    item.classList.remove('dragging');
                });

                cell.appendChild(item);
            }
        });
    }

    // Castle
    updateCastle() {
        const castleRoom = document.getElementById('castle-room');
        const currentRoom = this.gameState.rooms[this.gameState.currentRoom];

        // Update room name
        document.getElementById('current-room-name').textContent = currentRoom.name;

        // Clear room
        castleRoom.innerHTML = '';

        // Add drop zone for furniture placement
        castleRoom.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        castleRoom.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.dragSource === 'inventory' && this.draggedItem) {
                const rect = castleRoom.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                this.placeFurnitureInRoom(this.draggedItem, x, y);
            }
        });

        // Render placed furniture
        currentRoom.furniture.forEach((furnitureData) => {
            this.renderCastleFurniture(furnitureData);
        });

        // Add bunnies
        this.gameState.bunnies.forEach((bunny, index) => {
            if (bunny.unlocked) {
                const bunnyElement = document.createElement('div');
                bunnyElement.className = `bunny ${bunny.type}`;
                bunnyElement.id = `bunny-${bunny.id}`;

                // Random position
                const x = 20 + (index * 15) % 60;
                const y = 20 + (index * 20) % 50;
                bunnyElement.style.left = `${x}%`;
                bunnyElement.style.top = `${y}%`;

                // CSS-based bunny sprite with ears
                bunnyElement.innerHTML = `
                    <div class="bunny-sprite"></div>
                `;

                castleRoom.appendChild(bunnyElement);

                // Random movement
                this.animateBunny(bunnyElement);
            }
        });

        this.updateFurnitureInventory();
    }

    placeFurnitureInRoom(furniture, x, y) {
        const currentRoom = this.gameState.rooms[this.gameState.currentRoom];

        // Add to room's furniture list
        const furnitureData = {
            ...furniture,
            x: x,
            y: y,
            id: Date.now()
        };

        currentRoom.furniture.push(furnitureData);

        // Remove from available furniture
        const index = this.gameState.furniture.findIndex(f => f === furniture);
        if (index > -1) {
            this.gameState.furniture.splice(index, 1);
        }

        this.saveGame();
        this.updateCastle();
    }

    renderCastleFurniture(furnitureData) {
        const castleRoom = document.getElementById('castle-room');
        const furnitureElement = document.createElement('div');
        furnitureElement.className = 'castle-furniture';
        furnitureElement.style.left = `${furnitureData.x}%`;
        furnitureElement.style.top = `${furnitureData.y}%`;

        furnitureElement.innerHTML = `
            <div class="furniture-visual ${furnitureData.type}-visual" style="transform: scale(1.5);"></div>
        `;

        castleRoom.appendChild(furnitureElement);
    }

    animateBunny(bunnyElement) {
        setInterval(() => {
            const currentLeft = parseFloat(bunnyElement.style.left);
            const currentTop = parseFloat(bunnyElement.style.top);

            const newLeft = Math.max(10, Math.min(85, currentLeft + (Math.random() - 0.5) * 20));
            const newTop = Math.max(10, Math.min(85, currentTop + (Math.random() - 0.5) * 20));

            bunnyElement.style.left = `${newLeft}%`;
            bunnyElement.style.top = `${newTop}%`;
        }, 3000 + Math.random() * 2000);
    }

    // UI Updates
    updateUI() {
        // Main menu stats
        document.getElementById('player-level').textContent = this.gameState.level;
        document.getElementById('carrot-count').textContent = this.gameState.totalCarrots;
        document.getElementById('bunny-count').textContent = this.gameState.bunnies.filter(b => b.unlocked).length;

        // Carrot world
        document.getElementById('current-level').textContent = this.gameState.level;
        document.getElementById('carrots-in-level').textContent = this.gameState.carrotsInCurrentLevel;

        const progressBar = document.getElementById('level-progress');
        if (progressBar) {
            progressBar.style.width = `${(this.gameState.carrotsInCurrentLevel / 10) * 100}%`;
        }
    }

    // Save/Load
    saveGame() {
        localStorage.setItem('bunnyIslandSave', JSON.stringify(this.gameState));
    }

    loadGame() {
        const saved = localStorage.getItem('bunnyIslandSave');
        if (saved) {
            const loadedState = JSON.parse(saved);
            // Merge with default state to handle new properties
            this.gameState = {
                ...this.gameState,
                ...loadedState,
                rooms: loadedState.rooms || this.gameState.rooms
            };
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BunnyIslandGame();
});
