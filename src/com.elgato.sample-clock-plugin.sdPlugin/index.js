/// <reference path="libs/js/stream-deck.js" />
/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/utils.js" />

// Action Cache
const MACTIONS = {};

// Action Events
const sampleClockAction = new Action('com.elgato.sample-clock.action');

sampleClockAction.onWillAppear(({context, payload}) => {
    // console.log('will appear', context, payload);
    MACTIONS[context] = new SampleClockAction(context, payload);
});

sampleClockAction.onWillDisappear(({context}) => {
    // console.log('will disappear', context);
    MACTIONS[context].interval && clearInterval(MACTIONS[context].interval);
    delete MACTIONS[context];
});

sampleClockAction.onDidReceiveSettings(({context, payload}) => {
    //  console.log('onDidReceiveSettings', payload?.settings?.hour12, context, payload);
    MACTIONS[context].didReceiveSettings(payload?.settings);
});

sampleClockAction.onTitleParametersDidChange(({context, payload}) => {
    // console.log('wonTitleParametersDidChange', context, payload);
    MACTIONS[context].color = payload.titleParameters.titleColor;
    MACTIONS[context].ticks = ''; // trigger re-rendering of ticks
});

sampleClockAction.onDialPress(({context, payload}) => {
    // console.log('dial was pressed', context, payload);
    if(payload.pressed === false) {
        MACTIONS[context].toggleSeconds();
    }
});

sampleClockAction.onTouchTap(({context, payload}) => {
    // console.log('touchpanel was tapped', context, payload);
    if(payload.hold === false) {
        MACTIONS[context].toggleSeconds();
    }
});

class SampleClockAction {
    constructor (context, payload) {
        this.context = context;
        this.payload = payload;
        this.interval = null;
        this.isEncoder = payload?.controller === 'Encoder';
        this.settings = {
            ...{
                hour12: false,
                longDateAndTime: false,
                showTicks: true
            }, ...payload?.settings
        };
        this.ticks = '';
        this.timeOptions = {
            short: {hour: '2-digit', minute: '2-digit'},
            long: {hour: '2-digit', minute: '2-digit', second: '2-digit'}
        };
        this.dateOptions = {
            short: {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'},
            long: {weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric'}
        };
        this.size = 48; // default size of the icon is 48
        this.color = '#EFEFEF';
        this.saveSettings();
        this.init();
        this.update();
    }

    init() {
        this.interval = setInterval(() => {
            this.update();
        }, 1000);
    }

    didReceiveSettings(settings) {
        if(!settings) return;
        let dirty = false;
        if(settings.hasOwnProperty('hour12')) {
            this.settings.hour12 = settings.hour12 === true;
            dirty = true;
        }
        if(settings.hasOwnProperty('longDateAndTime')) {
            this.settings.longDateAndTime = settings.longDateAndTime === true;
            dirty = true;
        }
        if(settings.hasOwnProperty('color')) {
            this.settings.color = settings.color;
            dirty = true;
        }
        if(settings.hasOwnProperty('showTicks')) {
            this.settings.showTicks = settings.showTicks === true;
            this.ticks = ''; // trigger re-rendering of ticks
            dirty = true;
        }
        if(dirty) this.update();
    }

    saveSettings(immediateUpdate = false) {
        $SD.setSettings(this.context, this.settings);
        if(immediateUpdate) this.update();
    };

    toggleSeconds() {
        this.longDateAndTime = !this.longDateAndTime;
        this.update();
    }

    update() {
        const o = this.updateClockSettings();
        const svg = this.makeSvg(o);
        const icon = `data:image/svg+xml;base64,${btoa(svg)}`;
        if(this.isEncoder) {
            const payload = {
                'title': o.date,
                'value': o.time,
                icon
            };
            $SD.setFeedback(this.context, payload);
        }
        $SD.setImage(this.context, icon);
    }
    updateClockSettings() {
        const date = new Date();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const opts = this.longDateAndTime ? this.timeOptions.long : this.timeOptions.short;
        opts.hour12 = this.settings?.hour12 === true;
        const dateOpts = this.longDateAndTime ? this.dateOptions.long : this.dateOptions.short;
        return {
            minDeg: (minutes + seconds / 60) * 6,
            secDeg: seconds * 6,
            hourDeg: ((hours % 12) + minutes / 60) * 360 / 12,
            time: date.toLocaleTimeString([], opts),
            date: date.toLocaleDateString([], dateOpts),
            weekday: date.toLocaleDateString([], {weekday: 'long'}),
            hours,
            minutes,
            seconds
        };
    }

    makeSvg(o) {
        let scale = this.isEncoder ? 1 : 3;
        const w = this.size * scale;
        const r = w / 2;
        const sizes = {
            hours: Math.round(w / 4.5),
            minutes: Math.round(w / 9),
            seconds: Math.round(w / 36)
        };
        const strokes = {
            hours: Math.round(w / 30),
            minutes: Math.round(w / 36),
            seconds: Math.round(w / 48),
            center: Math.round(w / 24)
        };

        if(this.settings.showTicks === true) {
            const lineStart = Math.round(w / 20);
            const lineLength = Math.round(w / 8);
            // create ticks only once
            if(!this.ticks.length) {
                const line = `x1="${r}" y1="${lineStart}" x2="${r}" y2="${lineStart + lineLength}"`;
                const ticks = () => {
                    let str = `<g id="ticks" stroke-width="${sizes.seconds}" stroke="${this.color}">`;
                    for(let i = 0;i < 12;i++) {
                        str += `<line ${line} transform="rotate(${i * 30}, ${r}, ${r})"></line>`;
                    }
                    str += '</g>';
                    return str;
                };
                this.ticks = ticks();
            }
        }
        let amPmSymbol = '';
        if(this.settings.hour12 === true) {
            const amPmColor = o.hours > 12 ? '#0078FF' : '#FFB100';
            const amPm = o.hours > 12 ? 'PM' : 'AM';
            amPmSymbol = this.isEncoder ? '' : `<text font-family="${this.fontFamily}" text-anchor="middle" x="${r}" y="${r - 5 * scale}" font-size="${8 * scale}" font-weight="800" fill="${amPmColor}">${amPm}</text>`;
        }
        // if you prefer not to use a function to create ticks, see below at makeSvgAlt
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">
        ${this.ticks}
        ${amPmSymbol}
        <g stroke="${this.color}">
            <line id="hours" x1="${r}" y1="${sizes.hours}" x2="${r}" y2="${r}" stroke-width="${strokes.hours}" transform="rotate(${o.hourDeg}, ${r}, ${r})"></line>
            <line id="minutes" x1="${r}" y1="${sizes.minutes}" x2="${r}" y2="${r}" stroke-width="${strokes.minutes}" transform="rotate(${o.minDeg}, ${r}, ${r})"></line>
            ${this.longDateAndTime ? `<line id="seconds" x1="${r}" y1="${sizes.seconds}" x2="${r}" y2="${r}" stroke-width="${strokes.seconds}" transform="rotate(${o.secDeg}, ${r}, ${r})"></line>` : ''}
        </g>
        <circle cx="${r}" cy="${r}" r="${strokes.center}" fill="${this.color}" />
    </svg>`;
    };
};




// Alternative

const makeSvgAlt = (o) => {
    const w = 144;
    const r = w / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">
    <g id="ticks" stroke-width="4" stroke="#EFEFEF" x1="${r}" y1="10" x2="${r}" y2="25" >
        <line x1="${r}" y1="5" x2="${r}" y2="20"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(30, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(60, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(90, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(120, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(150, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(180, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(210, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(240, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(270, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(300, ${r}, ${r})"></line>
        <line x1="${r}" y1="5" x2="${r}" y2="20" transform="rotate(330, ${r}, ${r})"></line>
    </g>
    <g stroke="#DDDDDD">
        <circle cx="${r}" cy="${r}" r="4" fill="#DDDDDD" />
        <line id="hours" x1="${r}" y1="32" x2="${r}" y2="67" stroke-width="5" transform="rotate(${o.hourDeg}, ${r}, ${r})"></line>
        <line id="minutes" x1="${r}" y1="16" x2="${r}" y2="67" stroke-width="4" transform="rotate(${o.minDeg}, ${r}, ${r})"></line>
        <line id="seconds" x1="${r}" y1="4" x2="${r}" y2="67" stroke-width="3" transform="rotate(${o.secDeg}, ${r}, ${r})"></line>
    </g>
</svg>`;
};
