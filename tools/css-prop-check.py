import re, glob

CSS_PROPS = """align-content align-items align-self all animation animation-delay animation-direction
animation-duration animation-fill-mode animation-iteration-count animation-name animation-play-state
animation-timing-function appearance aspect-ratio backdrop-filter backface-visibility background
background-attachment background-blend-mode background-clip background-color background-image
background-origin background-position background-repeat background-size border border-block
border-bottom border-collapse border-color border-end-end-radius border-end-start-radius
border-image border-inline border-left border-radius border-right border-spacing
border-start-end-radius border-start-start-radius border-style border-top border-width bottom
box-shadow box-sizing break-after break-before break-inside caption-side caret-color clear clip
clip-path color color-scheme column-count column-fill column-gap column-rule columns column-span
column-width contain container content counter-increment counter-reset counter-set cursor
direction display empty-cells filter flex flex-basis flex-direction flex-flow flex-grow flex-shrink
flex-wrap float font font-family font-feature-settings font-kerning font-language-override
font-optical-sizing font-size font-size-adjust font-stretch font-style font-synthesis font-variant
font-variation-settings font-weight gap grid grid-area grid-auto-columns grid-auto-flow
grid-auto-rows grid-column grid-row grid-template height hyphens hyphenate-character
image-rendering inline-size inset inset-block inset-inline isolation justify-content justify-items
justify-self left letter-spacing line-break line-height list-style list-style-image
list-style-position list-style-type margin margin-block margin-inline mask mask-clip mask-composite
mask-image mask-mode mask-origin mask-position mask-repeat mask-size mask-type max-block-size
max-height max-inline-size max-width min-block-size min-height min-inline-size min-width
mix-blend-mode object-fit object-position offset opacity order orphans outline outline-color
outline-offset outline-style outline-width overflow overflow-anchor overflow-block
overflow-clip-margin overflow-inline overflow-wrap overflow-x overflow-y overscroll-behavior padding
padding-block padding-inline page-break-after page-break-before page-break-inside paint-order
perspective perspective-origin place-content place-items place-self pointer-events position
print-color-adjust quotes resize right rotate row-gap scale scroll-behavior scroll-margin
scroll-padding scroll-snap-align scroll-snap-stop scroll-snap-type scrollbar-color scrollbar-gutter
scrollbar-width shape-image-threshold shape-margin shape-outside tab-size table-layout text-align
text-align-last text-combine-upright text-decoration text-decoration-color text-decoration-line
text-decoration-skip-ink text-decoration-style text-decoration-thickness text-emphasis text-indent
text-justify text-orientation text-overflow text-rendering text-shadow text-size-adjust text-transform
text-underline-offset text-underline-position text-wrap top touch-action transform transform-box
transform-origin transform-style transition transition-delay transition-duration transition-property
transition-timing-function translate unicode-bidi user-select vertical-align visibility white-space
widows width will-change word-break word-spacing writing-mode z-index zoom accent-color fill
stroke stop-color flood-color flood-opacity lighting-color offset-anchor offset-distance offset-path
offset-position offset-rotate stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin
stroke-miterlimit stroke-opacity stroke-width"""

known = set(CSS_PROPS.split())
for f in sorted(glob.glob('/home/user/bearing-online/assets/css/*.css')):
    src = open(f, encoding='utf-8').read()
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    props = set(m.group(1) for m in re.finditer(r'([a-zA-Z-]+)\s*:', src))
    unknown = sorted(p for p in props
                     if p not in known and not p.startswith('--') and p not in ('from', 'to')
                     and not p.startswith('-webkit-') and not p.startswith('-moz-')
                     and not p.startswith('-ms-') and 'keyframes' not in p
                     and not p.endswith('keyframes'))
    print(f.split('/')[-1], '->', unknown if unknown else 'all known')
