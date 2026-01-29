document.addEventListener("alpine:init",()=>{Alpine.store("methods",{isMobile:document.documentElement.clientWidth<=1024,init(){this.isMobileDevice(),window.addEventListener("resize",()=>this.isMobileDevice())},isMobileDevice(){this.isMobile=document.documentElement.clientWidth<=1024}}),Alpine.store("methods").init()});
//# sourceMappingURL=mfr-alpine-functions.min.js.map
