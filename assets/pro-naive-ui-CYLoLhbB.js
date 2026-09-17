import{$ as e,B as t,C as n,E as r,F as i,O as a,T as o,_ as s,d as c,o as l,rt as u,s as d,st as f,tt as p,v as m,w as h,y as g}from"./vue-C0sUKR3V.js";import{A as _,B as v,D as y,I as b,L as x,O as S,R as C,b as w,c as T,j as E,k as D,n as O,y as k,z as A}from"./naive-ui-BV4eRHGP.js";var j=`[object String]`;function M(e){return typeof e==`string`||!D(e)&&_(e)&&E(e)==j}function N(e){return e==null}function P(e,t,n,r={level:1,parent:null}){n??=`children`,e.forEach((e,i,a)=>{let o=S(e,n,[]);t(e,i,r,a),D(o)&&P(o,t,n,{level:r.level+1,parent:e})})}function F(e){return typeof e==`function`?e():f(e)}typeof WorkerGlobalScope<`u`&&globalThis instanceof WorkerGlobalScope;function ee(e){let t=Object.create(null);return n=>t[n]||(t[n]=e(n))}var te=/\B([A-Z])/g,ne=ee(e=>e.replace(te,`-$1`).toLowerCase());function I(e){return e}var L=I(`global-config`);function re(e){i(L,e)}function R(){return n(L,{mergedEmpty:{form:`-`,tags:`-`,table:`-`,images:`-`,dateText:`-`,copyableText:`-`},mergedPropOverrides:{}})}function ie(e,t){let n=g(),{mergedPropOverrides:r}=R();return c(()=>{if(!n)return t;let i=n.vnode.props,a=f(r)[e];if(!a)return t;let o={...t};for(let e in a)if(e in t){if(i&&(e in i||ne(e)in i)){let n=t[e],r=a[e];typeof n==`object`&&n&&typeof r==`object`&&r&&(o[e]={...a[e],...n});continue}o[e]=a[e]}return o})}var z=`n`;function B(){let e=n(`n-config-provider`,null);return e?e.mergedClsPrefixRef:p(z)}function V(e,t,r,i){let o=b(),s=n(`n-config-provider`,null);if(r){let e=()=>{let e=i?.value;r.mount({id:t,head:!0,ssr:o,anchorMetaName:`naive-ui-style`,parent:s?.styleMountTarget,props:{bPrefix:e?`.${e}-`:void 0}})};o?e():a(e)}return c(()=>s?.mergedThemeOverridesRef.value?.[e]??{})}function H(e){return(e??[]).some(e=>!h(e)||!(e.type===l||e.type===d&&!H(e.children)))?e:null}function U(e,t){return t(e&&H(e())||null)}function W(e){return Object.keys(e)}function G(e,t=[],n){let r={};return Object.getOwnPropertyNames(e).forEach(n=>{t.includes(n)||(r[n]=e[n])}),Object.assign(r,n)}function K(e,t){let n=W(t);return c(()=>G(f(e),n))}var q={collapsed:{type:Boolean,default:void 0},"onUpdate:collapsed":[Function,Array],onUpdateCollapsed:[Function,Array],showLogo:{type:Boolean,default:void 0},showSidebar:{type:Boolean,default:void 0},showSidebarExtra:{type:Boolean,default:void 0},sidebarWidth:Number,sidebarCollapsedWidth:Number,showNav:{type:Boolean,default:void 0},navHeight:Number,navFixed:{type:Boolean,default:void 0},showFooter:{type:Boolean,default:void 0},footerHeight:Number,footerFixed:{type:Boolean,default:void 0},showTabbar:{type:Boolean,default:void 0},tabbarHeight:Number,mode:String,isMobile:Boolean,logoClass:[Array,String],asideClass:[Array,String],headerClass:[Array,String],navClass:[Array,String],tabbarClass:[Array,String],contentClass:[Array,String],footerClass:[Array,String],builtinThemeOverrides:Object,scrollbarProps:Object};function J(n){let i=e(!1);return t(n,()=>{i.value=!0,r(()=>{i.value=!1})}),{disabled:i}}function Y(e){return c(()=>({}))}function ae(){return v(`full-content`,[C(`pro-layout__aside`,`
      display: none;
    `),C(`pro-layout__scrollbar__inner`,`
        display: flex;
        min-height: 100%;
        flex-direction: column;
    `),C(`pro-layout__nav`,`
      display: none;
    `),C(`pro-layout__tabbar`,`
      display: none;
    `),C(`pro-layout__content`,`
        flex-grow: 1;
        flex-basis: 0;
        background: var(--pro-layout-content-color);
        transition:
          background .3s var(--n-bezier);
      `),C(`pro-layout__footer`,`
      display: none;
    `)])}function oe({mergedNav:e,mergedTabbar:t,mergedFooter:n}){let r=c(()=>{let n=e.value,r=t.value;return n.fixed&&n.show&&!r.show?`${n.height}px`:n.fixed&&r.show&&!n.show?`${r.height}px`:n.fixed&&n.show&&r.show?`${n.height+r.height}px`:`0px`}),i=c(()=>{let e=n.value;return e.show&&e.fixed?`${e.height}px`:`0px`});return c(()=>({"--pro-layout-content-margin-top":r.value,"--pro-layout-content-margin-bottom":i.value}))}function se(){return v(`horizontal`,[C(`pro-layout__aside`,`
      display: none;  
    `),C(`pro-layout__scrollbar__inner`,`
        display: flex;
        min-height: 100%;
        flex-direction: column;
    `),C(`pro-layout__header`,`
        box-sizing: border-box;
        background: var(--pro-layout-color);
        transition:
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: var(--pro-layout-z-index);
      `)]),C(`pro-layout__nav`,`
        display: flex;
        align-items: center;
        height: var(--pro-layout-nav-height);
        box-sizing: border-box;
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          border-color .3s var(--n-bezier);
    `,[C(`pro-layout__logo`,`
          width: var(--pro-layout-sidebar-width);
          height: 100%;
      `,[v(`hidden`,`
            width: 0;
            overflow: hidden;
          `)]),A(`left`,`
          height: 100%;
        `),A(`center`,`
          height: 100%;
          flex-grow: 1;
          flex-basis: 0;
          overflow: hidden;
        `),A(`right`,`
          height: 100%;
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__tabbar`,`
        height: var(--pro-layout-tabbar-height);
        display: flex;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          background .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
    `,[v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__content`,`
        flex-grow: 1;
        flex-basis: 0;
        background: var(--pro-layout-content-color);
        margin-top: var(--pro-layout-content-margin-top);
        margin-bottom: var(--pro-layout-content-margin-bottom);
        transition:
          background .3s var(--n-bezier);
     `),C(`pro-layout__footer`,`
        height: var(--pro-layout-footer-height);
        flex-shrink: 0;
        background: var(--pro-layout-color);
        transition: 
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
          z-index: var(--pro-layout-z-index);
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
        `)])])}function ce(e){let t=c(()=>e.value.mode??`vertical`),n=c(()=>e.value.isMobile??!1),r=c(()=>e.value.collapsed??!1),i=c(()=>{let{showSidebar:t,sidebarWidth:n,showSidebarExtra:r,sidebarCollapsedWidth:i}=e.value;return{width:n??224,show:t!==!1,showExtra:r!==!1,collapsedWidth:i??58}}),a=c(()=>{let{showNav:t,navFixed:n,navHeight:r}=e.value;return{show:t!==!1,fixed:n??!0,height:r??50}}),o=c(()=>{let{showFooter:t,footerFixed:n,footerHeight:r}=e.value;return{show:t!==!1,height:r??32,fixed:n??!1}}),s=c(()=>{let{showTabbar:t,tabbarHeight:n}=e.value;return{show:t!==!1,height:n??38}}),l=c(()=>({show:e.value.showLogo??!0})),u=c(()=>{let t=e.value.asideClass??[];return M(t)?[t]:t}),d=c(()=>{let t=e.value.logoClass??[];return M(t)?[t]:t}),f=c(()=>{let t=e.value.headerClass??[];return M(t)?[t]:t}),p=c(()=>{let t=e.value.navClass??[];return M(t)?[t]:t}),m=c(()=>{let t=e.value.tabbarClass??[];return M(t)?[t]:t}),h=c(()=>{let t=e.value.contentClass??[];return M(t)?[t]:t});return{mergedNav:a,mergedMode:t,mergedLogo:l,mergedFooter:o,mergedTabbar:s,mergedSidebar:i,mergedIsMobile:n,mergedNavClass:p,mergedLogoClass:d,mergedCollapsed:r,mergedAsideClass:u,mergedHeaderClass:f,mergedTabbarClass:m,mergedFooterClass:c(()=>{let t=e.value.footerClass??[];return M(t)?[t]:t}),mergedContentClass:h}}function le({mergedNav:e,mergedTabbar:t,mergedFooter:n}){let r=c(()=>{let n=e.value,r=t.value;return n.fixed&&n.show&&!r.show?`${n.height}px`:n.fixed&&r.show&&!n.show?`${r.height}px`:n.fixed&&n.show&&r.show?`${n.height+r.height}px`:`0px`}),i=c(()=>{let e=n.value;return e.show&&e.fixed?`${e.height}px`:`0px`});return c(()=>({"--pro-layout-content-margin-top":r.value,"--pro-layout-content-margin-bottom":i.value}))}function X(){return v(`mobile`,[C(`pro-layout__aside`,`
      display: none;
    `),C(`pro-layout__scrollbar__inner`,`
        display: flex;
        min-height: 100%;
        flex-direction: column;
    `),C(`pro-layout__header`,`
        box-sizing: border-box;
        background: var(--pro-layout-color);
        transition:
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: var(--pro-layout-z-index);
      `)]),C(`pro-layout__nav`,`
        display: flex;
        align-items: center;
        height: var(--pro-layout-nav-height);
        box-sizing: border-box;
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          border-color .3s var(--n-bezier);
    `,[C(`pro-layout__logo`,`
          height: 100%;
      `,[v(`hidden`,`
            width: 0;
            overflow: hidden;
          `)]),A(`left`,`
          height: 100%;
        `),A(`center`,`
          height: 100%;
          flex-grow: 1;
          flex-basis: 0;
          overflow: hidden;
        `),A(`right`,`
          height: 100%;
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__tabbar`,`
        height: var(--pro-layout-tabbar-height);
        display: flex;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          background .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
    `,[v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__content`,`
        flex-grow: 1;
        flex-basis: 0;
        background: var(--pro-layout-content-color);
        margin-top: var(--pro-layout-content-margin-top);
        margin-bottom: var(--pro-layout-content-margin-bottom);
        transition:
          background .3s var(--n-bezier);
      `),C(`pro-layout__footer`,`
        height: var(--pro-layout-footer-height);
        flex-shrink: 0;
        background: var(--pro-layout-color);
        transition: 
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
          z-index: var(--pro-layout-z-index);
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
        `)])])}function ue({mergedNav:e,mergedTabbar:t,mergedFooter:n,mergedSidebar:r,mergedCollapsed:i}){let a=c(()=>{let t=e.value;return t.show&&t.fixed?`calc(100% - ${t.height}px)`:`100%`}),o=c(()=>{let t=e.value;return t.show&&t.fixed?`${t.height}px`:`0px`}),s=c(()=>{let t=e.value,n=r.value,a=i.value;return!t.fixed&&n.show&&!a?`${n.width}px`:!t.fixed&&n.show&&a?`${n.collapsedWidth}px`:`0px`}),l=c(()=>{let e=r.value,t=i.value;return e.show?t?`${e.collapsedWidth}px`:`${e.width}px`:`0px`}),u=c(()=>{let e=r.value,t=i.value;return e.show?t?`${e.collapsedWidth}px`:`${e.width}px`:`0px`}),d=c(()=>{let n=e.value,r=t.value;return n.fixed&&n.show&&!r.show?`${n.height}px`:n.fixed&&r.show&&!n.show?`${r.height}px`:n.fixed&&n.show&&r.show?`${n.height+r.height}px`:`0px`}),f=c(()=>{let e=n.value;return e.fixed&&e.show?`${e.height}px`:`0px`}),p=c(()=>{let e=r.value,t=i.value;return e.show?t?`${e.collapsedWidth}px`:`${e.width}px`:`0px`}),m=c(()=>{let e=r.value,t=i.value;return e.show?t?`calc(100% - ${e.collapsedWidth}px)`:`calc(100% - ${e.width}px)`:`100%`});return c(()=>({"--pro-layout-sidebar-height":a.value,"--pro-layout-sidebar-margin-top":o.value,"--pro-layout-nav-margin-left":s.value,"--pro-layout-tabbar-margin-left":l.value,"--pro-layout-content-margin-top":d.value,"--pro-layout-content-margin-left":u.value,"--pro-layout-content-margin-bottom":f.value,"--pro-layout-footer-width":m.value,"--pro-layout-footer-margin-left":p.value}))}function de(){let e=[C(`pro-layout__aside`,`
        width: var(--pro-layout-sidebar-width);
        height: var(--pro-layout-sidebar-height);
        margin-top: var(--pro-layout-sidebar-margin-top);
        position: absolute;
        left: 0;
        top: 0;
        z-index: calc(var(--pro-layout-z-index) + 1);
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        border-right: 1px solid var(--pro-layout-border-color);
        transition:
          width .3s var(--n-bezier),
          background .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
      `,[C(`pro-layout__logo`,`
          display: none;
      `),v(`collapsed`,`
          width: var(--pro-layout-sidebar-collapsed-width);
        `),v(`hidden`,`
          width: 0;
          overflow: hidden;
          border-right: none;
          border-right-color: var(--pro-layout-border-color);
        `)]),C(`pro-layout__sidebar`,`
        flex-grow: 1;
        flex-basis: 0;
        display: flex;
        flex-direction: column;
    `),C(`pro-layout__sidebar-extra`,`
        display: none;
    `),C(`pro-layout__scrollbar__inner`,`
        display: flex;
        min-height: 100%;
        flex-direction: column;
    `),C(`pro-layout__header`,`
        background: var(--pro-layout-color);
        transition:
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: var(--pro-layout-z-index);
      `)]),C(`pro-layout__nav`,`
        height: var(--pro-layout-nav-height);
        display: flex;
        align-items: center;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        margin-left: var(--pro-layout-nav-margin-left);
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          background .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
    `,[C(`pro-layout__logo`,`
          height: 100%;
          width: var(--pro-layout-sidebar-width);
          flex-shrink: 0;
        `,[v(`hidden`,`
            width: 0;
            overflow: hidden;
          `)]),A(`left`,`
          height: 100%;
        `),A(`center`,`
          height: 100%;
          flex-grow: 1;
          flex-basis: 0;
          overflow: hidden;
        `),A(`right`,`
          height: 100%;
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
      `)]),C(`pro-layout__tabbar`,`
        height: var(--pro-layout-tabbar-height);
        display: flex;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        margin-left: var(--pro-layout-tabbar-margin-left);
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          background .3s var(--n-bezier),
          margin-left .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
    `,[v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__content`,`
       flex-grow: 1;
       flex-basis: 0;
       background: var(--pro-layout-content-color);
       margin-top: var(--pro-layout-content-margin-top);
       margin-left: var(--pro-layout-content-margin-left);
       margin-bottom: var(--pro-layout-content-margin-bottom);
       transition: 
        background .3s var(--n-bezier),
        margin-left .3s var(--n-bezier);
    `),C(`pro-layout__footer`,`
        width: var(--pro-layout-footer-width);
        height: var(--pro-layout-footer-height);
        background: var(--pro-layout-color);
        margin-left: var(--pro-layout-footer-margin-left);
        transition: 
          margin-left .3s var(--n-bezier),
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          position: absolute;
          bottom: 0;
          left: 0;
          z-index: var(--pro-layout-z-index);
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
        `)])];return[v(`sidebar`,e),v(`mixed-sidebar`,e)]}function fe({mergedNav:e,mergedLogo:t,mergedTabbar:n,mergedFooter:r,mergedSidebar:i,mergedCollapsed:a}){let o=c(()=>{let e=i.value,t=a.value;return e.show?e.showExtra&&t?`${e.collapsedWidth*2}px`:e.showExtra&&!t?`${e.collapsedWidth+e.width}px`:`${e.collapsedWidth}px`:`0px`}),s=c(()=>{let n=e.value;return t.value.show?`${n.height}px`:`0px`}),l=c(()=>{let t=e.value,r=n.value;return t.fixed&&t.show&&!r.show?`${t.height}px`:t.fixed&&r.show&&!t.show?`${r.height}px`:t.fixed&&t.show&&r.show?`${t.height+r.height}px`:`0px`}),u=c(()=>{let e=r.value;return e.fixed&&e.show?`${e.height}px`:`0px`});return c(()=>({"--pro-layout-sidebar-width":o.value,"--pro-layout-sidebar-margin-top":s.value,"--pro-layout-content-margin-top":l.value,"--pro-layout-content-margin-bottom":u.value}))}function pe(){let e=[C(`pro-layout__aside`,`
        position: relative;
        flex-shrink: 0;
        height: 100%;
        display: flex;
        width: var(--pro-layout-sidebar-width);
        background: var(--pro-layout-color);
        overflow: hidden;
        transition:
          width .3s var(--n-bezier),
          background .3s var(--n-bezier);
      `),C(`pro-layout__logo`,`
        position: absolute;
        top: 0;
        left: 0;
        height: var(--pro-layout-nav-height);
        width: var(--pro-layout-sidebar-collapsed-width);
    `,[v(`hidden`,`
          width: 0;
          overflow: hidden;
        `)]),C(`pro-layout__sidebar`,`
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        box-sizing: border-box;
        width: var(--pro-layout-sidebar-collapsed-width);
        margin-top: var(--pro-layout-sidebar-margin-top);
        border-right: 1px solid var(--pro-layout-border-color);
        transition:
          border-color .3s var(--n-bezier);
    `),C(`pro-layout__sidebar-extra`,`
        width: calc(100% - var(--pro-layout-sidebar-collapsed-width));
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--pro-layout-border-color);
        transition:
          width .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
    `,[v(`hidden`,`
          width: 0;
          overflow: hidden;
          border-right: none;
          border-right-color: var(--pro-layout-border-color);
        `)]),C(`pro-layout__scrollbar__inner`,`
        display: flex;
        min-height: 100%;
        flex-direction: column;
    `),C(`pro-layout__header`,`
        box-sizing: border-box;
        background: var(--pro-layout-color);
        transition:
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: var(--pro-layout-z-index);
      `)]),C(`pro-layout__nav`,`
        display: flex;
        align-items: center;
        box-sizing: border-box;
        height: var(--pro-layout-nav-height);
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          border-color .3s var(--n-bezier);
    `,[C(`pro-layout__logo`,`
          display: none;
      `),A(`left`,`
          height: 100%;
        `),A(`center`,`
          height: 100%;
          flex-grow: 1;
          flex-basis: 0;
          overflow: hidden;
        `),A(`right`,`
          height: 100%;
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__tabbar`,`
        height: var(--pro-layout-tabbar-height);
        display: flex;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          background .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
    `,[v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__content`,`
        flex-grow: 1;
        flex-basis: 0;
        background: var(--pro-layout-content-color);
        margin-top: var(--pro-layout-content-margin-top);
        margin-bottom: var(--pro-layout-content-margin-bottom);
        transition:
          background .3s var(--n-bezier);
      `),C(`pro-layout__footer`,`
        height: var(--pro-layout-footer-height);
        flex-shrink: 0;
        background: var(--pro-layout-color);
        transition: 
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
          z-index: var(--pro-layout-z-index);
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
        `)])];return[v(`two-column`,e),v(`mixed-two-column`,e)]}function me({mergedNav:e,mergedTabbar:t,mergedFooter:n}){let r=c(()=>{let n=e.value,r=t.value;return n.fixed&&n.show&&!r.show?`${n.height}px`:n.fixed&&r.show&&!n.show?`${r.height}px`:n.fixed&&n.show&&r.show?`${n.height+r.height}px`:`0px`}),i=c(()=>{let e=n.value;return e.fixed&&e.show?`${e.height}px`:`0px`});return c(()=>({"--pro-layout-content-margin-top":r.value,"--pro-layout-content-margin-bottom":i.value}))}function he(){return v(`vertical`,[C(`pro-layout__aside`,`
        width: var(--pro-layout-sidebar-width);
        height: 100%;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        border-right: 1px solid var(--pro-layout-border-color);
        transition:
          width .3s var(--n-bezier),
          background .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
      `,[v(`collapsed`,`
          width: var(--pro-layout-sidebar-collapsed-width);
        `),v(`hidden`,`
          width: 0;
          overflow: hidden;
          border-right: none;
          border-right-color: var(--pro-layout-border-color);
        `)]),C(`pro-layout__logo`,`
        height: var(--pro-layout-nav-height);
        flex-shrink: 0;
    `,[v(`hidden`,`
          height: 0;
          overflow: hidden;
        `)]),C(`pro-layout__sidebar`,`
        flex-grow: 1;
        flex-basis: 0;
        display: flex;
        flex-direction: column;
    `),C(`pro-layout__sidebar-extra`,`
        display: none;
    `),C(`pro-layout__scrollbar__inner`,`
        display: flex;
        min-height: 100%;
        flex-direction: column;
    `),C(`pro-layout__header`,`
        box-sizing: border-box;
        background: var(--pro-layout-color);
        transition:
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: var(--pro-layout-z-index);
      `)]),C(`pro-layout__nav`,`
        display: flex;
        align-items: center;
        height: var(--pro-layout-nav-height);
        box-sizing: border-box;
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          border-color .3s var(--n-bezier);
    `,[C(`pro-layout__logo`,`
          display: none;
      `),A(`left`,`
          height: 100%;
        `),A(`center`,`
          height: 100%;
          flex-grow: 1;
          flex-basis: 0;
          overflow: hidden;
        `),A(`right`,`
          height: 100%;
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__tabbar`,`
        height: var(--pro-layout-tabbar-height);
        display: flex;
        box-sizing: border-box;
        background: var(--pro-layout-color);
        border-bottom: 1px solid var(--pro-layout-border-color);
        transition:
          background .3s var(--n-bezier),
          border-color .3s var(--n-bezier);
    `,[v(`hidden`,`
          height: 0;
          overflow: hidden;
          border-bottom: none;
          border-bottom-color: var(--pro-layout-border-color);
      `)]),C(`pro-layout__content`,`
        flex-grow: 1;
        flex-basis: 0;
        background: var(--pro-layout-content-color);
        margin-top: var(--pro-layout-content-margin-top);
        margin-bottom: var(--pro-layout-content-margin-bottom);
        transition:
          background .3s var(--n-bezier);
      `),C(`pro-layout__footer`,`
        height: var(--pro-layout-footer-height);
        flex-shrink: 0;
        background: var(--pro-layout-color);
        transition: 
          background .3s var(--n-bezier);
      `,[v(`fixed`,`
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
          z-index: var(--pro-layout-z-index);
        `),v(`hidden`,`
          height: 0;
          overflow: hidden;
        `)])])}var ge=C(`pro-layout`,`
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    color: var(--pro-layout-text-color);
    background-color: var(--pro-layout-color);
    transition: 
      color .3s var(--n-bezier),
      background-color .3s var(--n-bezier);
  `,[v(`disabled-transition`,[x(`*`,`
      transition: none !important;
    `)]),C(`scrollbar-rail`,`
    z-index: calc(var(--pro-layout-z-index) + 1);
  `),X(),de(),he(),pe(),se(),ae()]),Z=`ProLayout`,_e=m({name:Z,inheritAttrs:!1,props:q,slots:Object,setup(e){let t=O(),n=B(),r=ie(Z,e),{mergedNav:a,mergedMode:o,mergedLogo:s,mergedTabbar:l,mergedFooter:d,mergedSidebar:f,mergedIsMobile:p,mergedCollapsed:m,mergedNavClass:h,mergedLogoClass:g,mergedAsideClass:_,mergedHeaderClass:v,mergedTabbarClass:b,mergedFooterClass:x,mergedContentClass:S}=ce(r),{disabled:C}=J(o),w={mergedNav:a,mergedLogo:s,mergedTabbar:l,mergedFooter:d,mergedSidebar:f,mergedCollapsed:m},T=le(w),E=ue(w),D=me(w),k=fe(w),A=oe(w),j=Y(),M=c(()=>({color:t.value.bodyColor,textColor:t.value.textColor2,layoutColor:t.value.cardColor,borderColor:t.value.dividerColor,...r.value.builtinThemeOverrides??{}})),N=c(()=>{let e=o.value,n={};return p.value?n=T.value:e===`sidebar`?n=E.value:e===`vertical`?n=D.value:e===`two-column`?n=k.value:e===`horizontal`?n=A.value:e===`full-content`?n=j.value:e===`mixed-sidebar`?n=E.value:e===`mixed-two-column`&&(n=k.value),{"--n-color":t.value.bodyColor,"--n-text-color":t.value.textColor2,"--n-bezier":t.value.cubicBezierEaseInOut,"--pro-layout-color":M.value.layoutColor,"--pro-layout-content-color":M.value.color,"--pro-layout-text-color":M.value.textColor,"--pro-layout-border-color":M.value.borderColor,"--pro-layout-z-index":1e3,"--pro-layout-nav-height":`${a.value.height}px`,"--pro-layout-tabbar-height":`${l.value.height}px`,"--pro-layout-sidebar-width":`${f.value.width}px`,"--pro-layout-footer-height":`${d.value.height}px`,"--pro-layout-sidebar-collapsed-width":`${f.value.collapsedWidth}px`,...n}}),P=c(()=>y({builtinThemeOverrides:{railInsetVerticalRight:`2px 0px 2px auto`}},r.value.scrollbarProps??{}));return V(Z,`pro-layout`,ge),i(`n-layout-sider`,{collapseModeRef:{value:`width`},collapsedRef:u(e,`collapsed`)}),{vars:N,disabled:C,mergedNav:a,mergedMode:o,mergedLogo:s,mergedTabbar:l,mergedFooter:d,mergedSidebar:f,mergedIsMobile:p,mergedClsPrefix:n,mergedCollapsed:m,mergedNavClass:h,mergedLogoClass:g,nScrollbarProps:P,mergedAsideClass:_,mergedHeaderClass:v,mergedTabbarClass:b,mergedFooterClass:x,mergedContentClass:S}},render(){let e=e=>U(this.$slots.logo,t=>t?s(`div`,{key:e,class:[`${this.mergedClsPrefix}-pro-layout__logo`,{[`${this.mergedClsPrefix}-pro-layout__logo--hidden`]:!this.mergedLogo.show},...this.mergedLogoClass]},[t]):null),t=U(this.$slots[`nav-left`],e=>s(`div`,{class:`${this.mergedClsPrefix}-pro-layout__nav__left`},[e])),n=U(this.$slots[`nav-center`],e=>s(`div`,{class:`${this.mergedClsPrefix}-pro-layout__nav__center`},[e])),r=U(this.$slots[`nav-right`],e=>s(`div`,{class:`${this.mergedClsPrefix}-pro-layout__nav__right`},[e])),i=U(this.$slots.sidebar,e=>e?s(`div`,{class:`${this.mergedClsPrefix}-pro-layout__sidebar`},[e]):null),a=U(this.$slots[`sidebar-extra`],e=>e?s(`div`,{class:[`${this.mergedClsPrefix}-pro-layout__sidebar-extra`,{[`${this.mergedClsPrefix}-pro-layout__sidebar-extra--hidden`]:!this.mergedSidebar.showExtra}]},[e]):null),c=e(`aside-logo`),l=e(`nav-logo`);return s(`div`,o(this.$attrs,{class:[`${this.mergedClsPrefix}-pro-layout`,{[`${this.mergedClsPrefix}-pro-layout--mobile`]:this.mergedIsMobile},{[`${this.mergedClsPrefix}-pro-layout--disabled-transition`]:this.disabled},{[`${this.mergedClsPrefix}-pro-layout--${this.mergedMode}`]:!this.mergedIsMobile}],style:this.vars}),[s(`aside`,{class:[`${this.mergedClsPrefix}-pro-layout__aside`,{[`${this.mergedClsPrefix}-pro-layout__aside--collapsed`]:this.mergedCollapsed},{[`${this.mergedClsPrefix}-pro-layout__aside--hidden`]:!this.mergedSidebar.show},...this.mergedAsideClass]},[c,i,a]),s(T,o({class:`${this.mergedClsPrefix}-pro-layout__scrollbar`,contentClass:`${this.mergedClsPrefix}-pro-layout__scrollbar__inner`},this.nScrollbarProps),{default:()=>{var e,i,a;return[s(`header`,{class:[`${this.mergedClsPrefix}-pro-layout__header`,{[`${this.mergedClsPrefix}-pro-layout__header--fixed`]:this.mergedNav.fixed},...this.mergedHeaderClass]},[s(`div`,{class:[`${this.mergedClsPrefix}-pro-layout__nav`,{[`${this.mergedClsPrefix}-pro-layout__nav--hidden`]:!this.mergedNav.show},...this.mergedNavClass]},[l,t,n,r]),s(`div`,{class:[`${this.mergedClsPrefix}-pro-layout__tabbar`,{[`${this.mergedClsPrefix}-pro-layout__tabbar--hidden`]:!this.mergedTabbar.show},...this.mergedTabbarClass]},[(e=this.$slots).tabbar?.call(e)])]),s(`main`,{class:[`${this.mergedClsPrefix}-pro-layout__content`,...this.mergedContentClass]},[(i=this.$slots).default?.call(i)]),s(`footer`,{class:[`${this.mergedClsPrefix}-pro-layout__footer`,{[`${this.mergedClsPrefix}-pro-layout__footer--fixed`]:this.mergedFooter.fixed},{[`${this.mergedClsPrefix}-pro-layout__footer--hidden`]:!this.mergedFooter.show},...this.mergedFooterClass]},[(a=this.$slots).footer?.call(a)])]}})])}}),Q={propOverrides:Object,empty:Object},ve={...w,...Q};function ye(e,t){let n={...e};for(let e in t)n[e]=e in n?{...n[e],...t[e]}:t[e];return n}var be=m({name:`ProConfigProvider`,props:ve,setup(e){let{mergedEmpty:t,mergedPropOverrides:n}=R(),r=K(e,Q),i=c(()=>ye(f(n),f(e.propOverrides)??{})),a={tags:`-`,form:`-`,table:`-`,images:`-`,dateText:`-`,copyableText:`-`};return re({mergedEmpty:c(()=>({...a,...f(t),...e.empty??{}})),mergedPropOverrides:i}),{nConfigProviderProps:r}},render(){return s(k,this.nConfigProviderProps,this.$slots)}});function xe(e){return{layout:c(()=>({horizontalMenuProps:{},verticalMenuProps:{},verticalExtraMenuProps:{}}))}}function Se({menus:e,activeKey:t,expandedKeys:n}){return{layout:c(()=>({verticalMenuProps:{},verticalExtraMenuProps:{},horizontalMenuProps:{mode:`horizontal`,collapsed:!1,responsive:!0,options:e.value,value:t.value,expandedKeys:n.value,onUpdateValue:e=>{t.value=e},onUpdateExpandedKeys:e=>{n.value=e}}}))}}function Ce(e,t){let n=c(()=>F(e)),r=c(()=>{let e=t.childrenField??`children`,r=new Map;return P(n.value,(e,t,{parent:n})=>{var i;let a=e.key,o=n?.key;N(a)||((i=r.get(o))==null||i.childrenKeys.push(a),r.set(a,{item:e,childrenKeys:[],parentKey:o}))},e),r}),i=c(()=>Array.from(r.value.keys()));function a(e){let t=[],n=r.value.get(e)?.parentKey;for(;!N(n);){t.unshift(n);let e=r.value.get(n);if(!e)break;n=e.parentKey}return t}function o(e){let t=[],n=r.value.get(e)?.childrenKeys?.[0];for(;!N(n);){t.push(n);let e=r.value.get(n);if(!e)break;n=e.childrenKeys?.[0]}return t}function s(e){let t=i.value.includes(e);return[...a(e),t?e:void 0,...o(e)].filter(e=>!N(e))}return{fullKeys:i,getAncestorKeys:a,menuKeyToMetaMap:r,getDescendantKeys:o,getMenuKeyFullPath:s,menus:n}}function we(e,t,n=`children`){let r=!1,i=Symbol(`level`),a=e.map(e=>({...e,[i]:1})),o=()=>{r=!0};for(;a.length>0;){let e=a.shift(),{[i]:s,...c}=e;if(t(c,s,o),r){a=[],a.length=0;break}let l=e[n];l&&l.length>0&&a.push(...l.map(e=>({...e,[i]:s+1})))}}function $(e,t,n={}){let{childrenField:r=`children`}=n;{let t=[],n=[];return we(e,(e,i,a)=>{if(i>2){a();return}if(i===1){let{[r]:n,...i}=e;t.push(i);return}i===2&&n.push(e)},r),[t,n]}}function Te({menus:e,activeKey:t,expandedKeys:n,childrenField:r,menuKeyToMetaMap:i,getMenuKeyFullPath:a}){let o=c(()=>a(t.value)[0]??null),s=c(()=>$(e.value,1,{childrenField:r})[0]??[]),l=c(()=>{let e=i.value.get(o.value);return e?e.item[r]??[]:[]});return{layout:c(()=>({horizontalMenuProps:{mode:`horizontal`,responsive:!0,collapsed:!1,options:s.value,value:o.value,onUpdateValue:e=>{t.value=e}},verticalMenuProps:{mode:`vertical`,value:t.value,options:l.value,expandedKeys:n.value,onUpdateValue:e=>{t.value=e},onUpdateExpandedKeys:e=>{n.value=e}},verticalExtraMenuProps:{}}))}}function Ee({menus:e,activeKey:t,expandedKeys:n,childrenField:r,menuKeyToMetaMap:i,getMenuKeyFullPath:a}){let o=c(()=>a(t.value)[0]??null),s=c(()=>{let e=o.value,n=a(t.value)[1]??null;return t.value!==e&&t.value!==n?n:t.value}),l=c(()=>$(e.value,1,{childrenField:r})[0]??[]),u=c(()=>{let e=i.value.get(o.value);return e?$(e.item[r]??[],1,{childrenField:r})[0]:[]}),d=c(()=>{if(u.value.findIndex(e=>e.key===s.value)===-1)return[];let e=i.value.get(s.value);return e?e.item[r]??[]:[]});return{layout:c(()=>({horizontalMenuProps:{mode:`horizontal`,responsive:!0,collapsed:!1,options:l.value,value:o.value,onUpdateValue:e=>{t.value=e}},verticalMenuProps:{mode:`vertical`,options:u.value,value:s.value,collapsed:!0,onUpdateValue:e=>{t.value=e}},verticalExtraMenuProps:{mode:`vertical`,value:t.value,expandedKeys:n.value,options:d.value,onUpdateValue:e=>{t.value=e},onUpdateExpandedKeys:e=>{n.value=e}}}))}}function De({menus:e,activeKey:t,expandedKeys:n,childrenField:r,menuKeyToMetaMap:i,getMenuKeyFullPath:a}){let o=c(()=>a(t.value)[0]??null),s=c(()=>$(e.value,1,{childrenField:r})[0]??[]),l=c(()=>{let e=i.value.get(o.value);return e?e.item[r]??[]:[]});return{layout:c(()=>({horizontalMenuProps:{},verticalMenuProps:{mode:`vertical`,options:s.value,value:o.value,collapsed:!0,onUpdateValue:e=>{t.value=e}},verticalExtraMenuProps:{mode:`vertical`,value:t.value,expandedKeys:n.value,options:l.value,onUpdateValue:e=>{t.value=e},onUpdateExpandedKeys:e=>{n.value=e}}}))}}function Oe({menus:e,activeKey:t,expandedKeys:n}){return{layout:c(()=>({horizontalMenuProps:{},verticalExtraMenuProps:{},verticalMenuProps:{mode:`vertical`,options:e.value,value:t.value,expandedKeys:n.value,onUpdateValue:e=>{t.value=e},onUpdateExpandedKeys:e=>{n.value=e}}}))}}function ke(n){let r=e(null),i=e([]),a=n.childrenField??`children`,o=c(()=>F(n.mode)),s=c(()=>F(n.accordion??!1)),{menus:l,fullKeys:u,getAncestorKeys:d,menuKeyToMetaMap:f,getMenuKeyFullPath:p}=Ce(n.menus,{childrenField:a}),m={menus:l,activeKey:r,expandedKeys:i,childrenField:a,menuKeyToMetaMap:f,getMenuKeyFullPath:p},h=Oe(m),g=De(m),_=Se(m),v=xe(),y=Te(m),b=Ee(m),x=c(()=>{switch(o.value){case`sidebar`:case`vertical`:return h;case`horizontal`:return _;case`mixed-sidebar`:return y;case`full-content`:return v;case`two-column`:return g;case`mixed-two-column`:return b;default:return v}});return t(r,()=>{let e=s.value?d(r.value):[...i.value,...d(r.value)];i.value=Array.from(new Set(e))}),{fullKeys:u,activeKey:r,getMenuKeyFullPath:p,layout:c(()=>x.value.layout.value),verticalLayout:c(()=>h.layout.value),horizontalLayout:c(()=>_.layout.value),mixedSidebarLayout:c(()=>y.layout.value),fullContentLayout:c(()=>v.layout.value),twoColumnLayout:c(()=>g.layout.value),mixedTwoColumnLayout:c(()=>b.layout.value)}}export{be as n,_e as r,ke as t};