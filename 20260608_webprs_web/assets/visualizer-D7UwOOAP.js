import{C as e,b as t,c as n,i as r,o as i,p as a,s as o,w as s}from"./utils-PTDM00I5.js";var c=class extends n{constructor(...e){super(...e),this.sliderIsLocked=!1}renderBackground(){return a` <div id="backgroundImageContainerContainer">
      <div id="backgroundImageContainer">
        <img id="backgroundImage" src="rainbow.png" />
      </div>
    </div>`}renderSlider(){return a` <div class="slider">
      <div class="verticalImageSlider" @click=${this.onMouseClick}>
        <div>
          <p id="bottomText">Original image</p>
          <img id="bottomImage" src="rainbow.png" />
        </div>
        <div id="verticalImageWindow">
          <div class="horizontalImageSlider">
            <div>
              <p id="rightText">WebP quality 50 (50.1kB)</p>
              <img id="rightImage" src="rainbow_q50.webp" />
            </div>
            <div id="horizontalImageWindow">
              <p id="leftText">WebP quality 0 (8.8kB)</p>
              <img id="leftImage" src="rainbow_q0.webp" />
            </div>
          </div>
        </div>
      </div>
    </div>`}render(){return a`${this.renderBackground()} ${this.renderSlider()}`}onMouseMove(e){if(this.sliderIsLocked)return;let t=this.rightImage.getBoundingClientRect(),n=Math.max(0,Math.min(t.width-1,e.pageX-(t.x+window.scrollX))),r=Math.max(0,Math.min(t.height-1,e.pageY-(t.y+window.scrollY)));this.horizontalImageWindow.style.width=`${n}px`,this.verticalImageWindow.style.height=`${r}px`}onMouseClick(e){this.sliderIsLocked=!this.sliderIsLocked,this.onMouseMove(e)}firstUpdated(){let e=new URLSearchParams(window.location.search);l(this.bottomImage,this.bottomText,e,`bimg`,`btxt`),l(this.rightImage,this.rightText,e,`rimg`,`rtxt`),l(this.leftImage,this.leftText,e,`limg`,`ltxt`),this.backgroundImage.src=this.bottomImage.src,e.get(`rimg`)===e.get(`limg`)&&e.get(`rtxt`)===e.get(`ltxt`)&&(this.horizontalImageWindow.hidden=!0),this.addEventListener(`mousemove`,this.onMouseMove)}static{this.styles=e`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #808080;
    }
    .slider img {
      background-color: #808080; /* fallback in case of image loading failure */
      background-image: url('transparency_checkerboard.webp');
    }
    #backgroundImageContainerContainer {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }
    #backgroundImageContainer {
      position: absolute;
      top: -400px;
      left: -400px;
      right: -400px;
      bottom: -400px;
    }
    #backgroundImage {
      width: 100%;
      height: 100%;
      filter: blur(200px); /* Find another solution if this is too laggy */
    }

    .slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 0;
    }

    .verticalImageSlider {
      position: relative;
      display: inline-block;
      box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.4);
    }
    .verticalImageSlider:hover {
      cursor: crosshair;
    }
    #verticalImageWindow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      min-height: 0%;
      height: 50%;
      max-height: 100%;
      overflow: hidden;
      border-bottom: 1px dashed black;
    }

    .horizontalImageSlider {
      position: relative;
      display: inline-block;
    }
    #horizontalImageWindow {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      min-width: 0%;
      width: 50%;
      max-width: 100%;
      overflow: hidden;
      border-right: 1px dashed black;
    }

    img {
      user-select: none;
    }
    #bottomImage,
    #leftImage,
    #rightImage {
      /* Make sure the whole image is displayed by resizing it to at most 96% of
       * the canvas. This works because all three images have the same original
       * size and viewport dimensions are not parent-relative. */
      max-width: 96vw;
      max-height: 96vh;
    }

    #bottomText,
    #leftText,
    #rightText {
      padding: 4px 8px;
      margin: 0;
      position: absolute;
      color: black;
      text-shadow: white 0 0 6px, white 0 0 4px, white 0 0 2px;
      white-space: nowrap;
      line-height: 20px;
      user-select: none;
    }
    #bottomText {
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
    }
    #leftText {
      top: 0;
      left: 0;
    }
    #rightText {
      top: 0;
      right: 0;
      text-align: right;
    }
  `}};i([t(`#verticalImageWindow`),o(`design:type`,typeof HTMLImageElement>`u`?Object:HTMLImageElement)],c.prototype,`verticalImageWindow`,void 0),i([t(`#horizontalImageWindow`),o(`design:type`,typeof HTMLImageElement>`u`?Object:HTMLImageElement)],c.prototype,`horizontalImageWindow`,void 0),i([t(`#leftImage`),o(`design:type`,typeof HTMLImageElement>`u`?Object:HTMLImageElement)],c.prototype,`leftImage`,void 0),i([t(`#rightImage`),o(`design:type`,typeof HTMLImageElement>`u`?Object:HTMLImageElement)],c.prototype,`rightImage`,void 0),i([t(`#bottomImage`),o(`design:type`,typeof HTMLImageElement>`u`?Object:HTMLImageElement)],c.prototype,`bottomImage`,void 0),i([t(`#backgroundImage`),o(`design:type`,typeof HTMLImageElement>`u`?Object:HTMLImageElement)],c.prototype,`backgroundImage`,void 0),i([t(`#leftText`),o(`design:type`,typeof HTMLParagraphElement>`u`?Object:HTMLParagraphElement)],c.prototype,`leftText`,void 0),i([t(`#rightText`),o(`design:type`,typeof HTMLParagraphElement>`u`?Object:HTMLParagraphElement)],c.prototype,`rightText`,void 0),i([t(`#bottomText`),o(`design:type`,typeof HTMLParagraphElement>`u`?Object:HTMLParagraphElement)],c.prototype,`bottomText`,void 0),c=i([s(`image-visualizer`)],c);function l(e,t,n,i,a){let o=n.get(i);if(o!==null){e.src=o;let i=n.get(a);i===null?t.textContent=r(e.src):t.textContent=i}}