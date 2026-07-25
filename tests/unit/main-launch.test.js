import { vi } from 'vitest';

describe('app launch shows next departures board', () => {
    const storedItems = {};

    function setupDom() {
        document.body.innerHTML = `
            <div class="app-layout">
                <screen-manager>
                    <div id="view-api-key" class="view-screen active">
                        <input id="api-key-input">
                        <button id="api-key-submit"></button>
                        <p id="api-key-error" style="display:none;"></p>
                    </div>
                    <div id="view-board" class="view-screen">
                        <header-actions></header-actions>
                        <section class="search-section">
                            <div class="input-row">
                                <auto-complete id="dest-autocomplete" placeholder="Où allez-vous ?">
                                    <clear-button id="dest-clear-btn" size="16"></clear-button>
                                </auto-complete>
                                <button id="search-action-btn"></button>
                            </div>
                        </section>
                        <section class="board-section">
                            <div id="journeys-board">
                                <div class="sys-msg">Initialisation du tableau des départs...</div>
                            </div>
                        </section>
                        <refresh-button id="manual-refresh-btn"></refresh-button>
                    </div>
                    <div id="view-settings" class="view-screen">
                        <ul class="settings-list">
                            <li class="settings-item-static">
                                <span class="item-icon"><span class="icon-placeholder" data-icon="sun" data-size="22"></span></span>
                                <span class="item-label">Mode Sombre</span>
                                <label class="switch">
                                    <input id="theme-toggle" type="checkbox">
                                    <span class="slider"></span>
                                </label>
                            </li>
                        </ul>
                    </div>
                    <div id="view-settings-favorites" class="view-screen"><favorites-manager></favorites-manager></div>
                    <div id="view-settings-filters" class="view-screen"><search-settings></search-settings></div>
                    <div id="view-settings-api-key" class="view-screen">
                        <input id="api-key-settings-input">
                        <button id="api-key-settings-save"></button>
                        <button id="api-key-clear-btn"></button>
                        <p id="api-key-settings-msg" style="display:none;"></p>
                    </div>
                </screen-manager>
            </div>
        `;
    }

    async function loadMain() {
        const { currentConfig } = await import('../../src/state.js');
        currentConfig.apiKey = 'test-api-key';
        currentConfig.defaultRoute = {
            from: { id: 'stop_area:SNCF:87732206', name: 'St-Germain-des-Fossés' },
            to: { id: 'stop_area:SNCF:87732008', name: 'Vichy' },
            label: 'St-Germain-des-Fossés ➔ Vichy'
        };

        await import('../../src/components/screen-manager/screen-manager.js');
        await import('../../src/components/header-actions/header-actions.js');
        await import('../../src/components/auto-complete/auto-complete.js');
        await import('../../src/components/clear-button/clear-button.js');
        await import('../../src/components/refresh-button/refresh-button.js');
        await import('../../src/components/journey-card/journey-card.js');
        await import('../../src/main.js');

        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        journeys: [
                            {
                                departure_date_time: '20260703T100000',
                                arrival_date_time: '20260703T103000',
                                sections: [
                                    {
                                        type: 'public_transport',
                                        display_informations: {
                                            direction: 'Vichy',
                                            headsign: 'TGV123',
                                            physical_mode: 'train'
                                        }
                                    }
                                ]
                            }
                        ]
                    })
            })
        );

        document.dispatchEvent(new Event('DOMContentLoaded'));
    }

    function createWindowStub(realEventDispatch = false) {
        const listeners = {};
        return {
            dispatchEvent: (event) => {
                const type = event.type;
                if (realEventDispatch && listeners[type]) {
                    listeners[type].forEach(handler => handler(event));
                }
                return true;
            },
            addEventListener: (type, handler) => {
                if (!listeners[type]) listeners[type] = [];
                listeners[type].push(handler);
            },
            removeEventListener: (type, handler) => {
                if (listeners[type]) {
                    listeners[type] = listeners[type].filter(h => h !== handler);
                }
            },
            matchMedia: () => ({ matches: false })
        };
    }

    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: (key) => storedItems[key] || null,
            setItem: (key, value) => { storedItems[key] = value; },
            removeItem: (key) => { delete storedItems[key]; },
            clear: () => { Object.keys(storedItems).forEach(k => delete storedItems[k]); }
        });

        vi.stubGlobal('window', createWindowStub(true));

        vi.resetModules();
        setupDom();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        Object.keys(storedItems).forEach(k => delete storedItems[k]);
        if (global.fetch) {
            global.fetch.mockClear?.();
        }
    });

    it('navigates to the board and renders next departures when API key and default route are set', async () => {
        await loadMain();

        await new Promise(resolve => setTimeout(resolve, 0));

        const board = document.getElementById('view-board');
        expect(board.classList.contains('active')).toBe(true);

        const journeysBoard = document.getElementById('journeys-board');
        expect(journeysBoard.innerHTML).not.toContain('Initialisation du tableau');
        expect(journeysBoard.querySelector('journey-card')).not.toBeNull();
    });

    it('opens settings panel when gear icon is clicked on the board', async () => {
        const panelHost = document.createElement('settings-panel');
        panelHost.innerHTML = `
            <div id="view-settings" class="view-screen">Settings Main</div>
            <div id="view-settings-favorites" class="view-screen">Favorites Screen</div>
            <div id="view-settings-filters" class="view-screen">Filters Screen</div>
            <div id="view-settings-api-key" class="view-screen">API Key Settings</div>
        `;
        document.querySelector('.app-layout').appendChild(panelHost);

        await import('../../src/components/settings-panel/settings-panel.js');

        await loadMain();

        await new Promise(resolve => setTimeout(resolve, 0));

        const panel = document.querySelector('settings-panel');
        expect(panel.classList.contains('active')).toBe(false);

        const headerEl = document.querySelector('header-actions');
        const gearBtn = headerEl.shadowRoot.getElementById('go-settings-btn');
        gearBtn.click();

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(panel.classList.contains('active')).toBe(true);
    });

    it('navigates to the board and renders next departures after geolocation fallback', async () => {
        vi.stubGlobal('window', createWindowStub(true));

        vi.stubGlobal('navigator', {
            geolocation: {
                getCurrentPosition: (success) => success({
                    coords: { latitude: 46.2, longitude: 3.4 }
                })
            }
        });

        const { currentConfig } = await import('../../src/state.js');
        currentConfig.apiKey = 'test-api-key';
        currentConfig.defaultRoute = null;

        await import('../../src/components/screen-manager/screen-manager.js');
        await import('../../src/components/header-actions/header-actions.js');
        await import('../../src/components/auto-complete/auto-complete.js');
        await import('../../src/components/clear-button/clear-button.js');
        await import('../../src/components/refresh-button/refresh-button.js');
        await import('../../src/components/journey-card/journey-card.js');
        await import('../../src/main.js');

        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        journeys: [
                            {
                                departure_date_time: '20260703T100000',
                                arrival_date_time: '20260703T103000',
                                sections: [
                                    {
                                        type: 'public_transport',
                                        display_informations: {
                                            direction: 'Vichy',
                                            headsign: 'TGV123',
                                            physical_mode: 'train'
                                        }
                                    }
                                ]
                            }
                        ]
                    })
            })
        );

        document.dispatchEvent(new Event('DOMContentLoaded'));

        await new Promise(resolve => setTimeout(resolve, 50));

        const board = document.getElementById('view-board');
        expect(board.classList.contains('active')).toBe(true);

        const journeysBoard = document.getElementById('journeys-board');
        expect(journeysBoard.innerHTML).toContain('TGV123');
    });

    it('falls back to default stations (St Germain → Vichy) when geolocation permission is denied', async () => {
        vi.stubGlobal('window', createWindowStub(true));

        vi.stubGlobal('navigator', {
            geolocation: {
                getCurrentPosition: (success, error) => {
                    error({ code: 1, message: 'Permission denied' });
                }
            }
        });

        const { currentConfig } = await import('../../src/state.js');
        currentConfig.apiKey = 'test-api-key';
        currentConfig.defaultRoute = null;

        await import('../../src/components/screen-manager/screen-manager.js');
        await import('../../src/components/header-actions/header-actions.js');
        await import('../../src/components/auto-complete/auto-complete.js');
        await import('../../src/components/clear-button/clear-button.js');
        await import('../../src/components/refresh-button/refresh-button.js');
        await import('../../src/components/journey-card/journey-card.js');
        await import('../../src/main.js');

        document.dispatchEvent(new Event('DOMContentLoaded'));

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(currentConfig.from.name).toBe('St-Germain-des-Fossés');
        expect(currentConfig.to.name).toBe('Vichy');
    });

    it('falls back to default stations (St Germain → Vichy) when geolocation times out', async () => {
        vi.stubGlobal('window', createWindowStub(true));

        vi.stubGlobal('navigator', {
            geolocation: {
                getCurrentPosition: (success, error) => {
                    error({ code: 3, message: 'Timeout' });
                }
            }
        });

        const { currentConfig } = await import('../../src/state.js');
        currentConfig.apiKey = 'test-api-key';
        currentConfig.defaultRoute = null;

        await import('../../src/components/screen-manager/screen-manager.js');
        await import('../../src/components/header-actions/header-actions.js');
        await import('../../src/components/auto-complete/auto-complete.js');
        await import('../../src/components/clear-button/clear-button.js');
        await import('../../src/components/refresh-button/refresh-button.js');
        await import('../../src/components/journey-card/journey-card.js');
        await import('../../src/main.js');

        document.dispatchEvent(new Event('DOMContentLoaded'));

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(currentConfig.from.name).toBe('St-Germain-des-Fossés');
        expect(currentConfig.to.name).toBe('Vichy');
    });

    it('falls back to default stations (St Germain → Vichy) when geolocation is not supported', async () => {
        vi.stubGlobal('window', createWindowStub(true));
        vi.stubGlobal('navigator', {});

        const { currentConfig } = await import('../../src/state.js');
        currentConfig.apiKey = 'test-api-key';
        currentConfig.defaultRoute = null;

        await import('../../src/components/screen-manager/screen-manager.js');
        await import('../../src/components/header-actions/header-actions.js');
        await import('../../src/components/auto-complete/auto-complete.js');
        await import('../../src/components/clear-button/clear-button.js');
        await import('../../src/components/refresh-button/refresh-button.js');
        await import('../../src/components/journey-card/journey-card.js');
        await import('../../src/main.js');

        document.dispatchEvent(new Event('DOMContentLoaded'));

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(currentConfig.from.name).toBe('St-Germain-des-Fossés');
        expect(currentConfig.to.name).toBe('Vichy');
    });
});
