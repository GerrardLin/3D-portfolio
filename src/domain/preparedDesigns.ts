import { directionFor } from "./direction.ts";
import { approvedBrief, localExtraction, parsePages, syntheticProfile, type PortfolioBrief } from "./profile.ts";
import { Demonstration } from "./demo.ts";
import type { Part, SpaceSpec } from "./spatial.ts";
import { compose, makePublished, type DesignNotes, type ExhibitSpec, type Layout, type SceneSpec } from "./scene.ts";

type Choice = { index: number; component: ExhibitSpec["componentId"]; because: string };
const technical = syntheticProfile();
const technicalBrief = approvedBrief(technical.author, "Applied AI hiring team", technical.entries);
const communitySource = parsePages([`Harbour Access Map — Co-designed a map of step-free entrances with a local community group and marked the routes tested by volunteers.

Street interviews — Interviewed eight residents about confusing entrances and annotated the locations where they changed routes.

Neighbourhood Access Volunteer, 2024 — Coordinated weekend route checks and turned field notes into map corrections.

Map prototype, 2025 — Designed a printable first edition and tested its symbols in three guided walkthroughs.

Skills — Interview planning, wayfinding design, Figma, and field documentation.`]);
const communityBrief = approvedBrief("Noah Rivera", "Community design and accessibility", localExtraction(communitySource)
  .map(entry => ({ ...entry, approved: true })));

const piece = (form: Part["form"], finish: Part["finish"], at: Part["at"], size: Part["size"], yaw?: number): Part =>
  ({ form, finish, at, size, yaw });

const labObjects: Part[][] = [
  [
    piece("box", "metal", [0, 0.14, 0], [3.6, 0.28, 1.9]),
    piece("disc", "surface", [0, 0.41, 0], [2.25, 0.27, 1.35]),
    piece("ring", "accent", [0, 1.61, 0], [2.5, 2.45, 0.28]),
    piece("ring", "paper", [0, 1.61, 0.09], [1.76, 1.76, 0.15]),
    piece("dome", "metal", [0, 0.92, 0.05], [1.04, 0.92, 0.94]),
  ],
  [
    piece("box", "metal", [0, 0.17, 0], [2.65, 0.34, 1.74]),
    piece("box", "paper", [-0.62, 0.61, 0], [0.84, 0.54, 1.01]),
    piece("box", "accent", [-0.62, 0.98, 0], [1, 0.2, 1.24]),
    piece("box", "paper", [0.62, 0.61, 0], [0.84, 0.54, 1.01]),
    piece("box", "accent", [0.62, 0.98, 0], [1, 0.2, 1.24]),
    piece("box", "metal", [0, 0.63, 0], [0.53, 0.2, 0.12]),
  ],
  [
    piece("box", "metal", [0, 0.14, 0], [2.82, 0.28, 1.64]),
    piece("arch", "paper", [0, 1.19, 0.23], [2.41, 2.07, 0.22]),
    piece("arch", "accent", [0, 1.26, -0.42], [2.68, 2.24, 0.19]),
    piece("wedge", "surface", [0, 0.35, 0], [1.26, 0.35, 1.02]),
  ],
  [
    piece("disc", "metal", [0, 0.12, 0], [1.8, 0.24, 1.48]),
    piece("box", "paper", [-0.26, 0.46, 0], [0.28, 0.69, 0.32]),
    piece("wedge", "accent", [0.13, 0.88, 0], [1.35, 0.78, 0.91], -18),
  ],
  [
    piece("disc", "metal", [0, 0.12, 0], [2.15, 0.24, 1.34]),
    piece("disc", "surface", [0, 0.34, 0], [1.76, 0.22, 1.19]),
    piece("disc", "accent", [0, 0.59, 0], [1.26, 0.25, 0.91]),
    piece("disc", "paper", [0, 0.9, 0], [0.85, 0.36, 0.63]),
  ],
];

const fieldObjects: Part[][] = [
  [
    piece("disc", "metal", [0, 0.16, 0], [3.45, 0.32, 3.12]),
    piece("disc", "paper", [0, 0.37, 0], [3.04, 0.21, 2.73]),
    piece("wedge", "surface", [-0.4, 0.64, -0.17], [1.45, 0.46, 1.36], -21),
    piece("wedge", "metal", [0.3, 0.71, 0.27], [1.38, 0.59, 0.95], 31),
    piece("dome", "accent", [-0.89, 0.59, 0.53], [0.38, 0.27, 0.38]),
    piece("dome", "accent", [0.76, 0.61, -0.61], [0.43, 0.36, 0.43]),
  ],
  [
    piece("disc", "surface", [0, 0.13, 0], [2.05, 0.26, 1.8]),
    piece("dome", "paper", [-0.36, 0.51, 0], [1.21, 0.58, 1.21]),
    piece("dome", "accent", [0.4, 0.5, -0.3], [0.8, 0.67, 0.8]),
    piece("ring", "metal", [-0.09, 0.45, 0.44], [1.28, 0.68, 0.19]),
  ],
  [
    piece("wedge", "metal", [0, 0.35, 0], [1.75, 0.7, 1.6], 18),
    piece("dome", "accent", [0.46, 0.65, 0.27], [0.72, 0.61, 0.72]),
  ],
  [
    piece("box", "metal", [0, 0.13, 0], [2.35, 0.26, 1.91], -13),
    piece("box", "surface", [0, 0.32, 0], [2, 0.16, 1.55], 9),
    piece("box", "paper", [0, 0.47, 0], [1.72, 0.11, 1.41], -19),
    piece("wedge", "accent", [0.17, 0.64, 0], [0.51, 0.29, 1.15], 42),
  ],
  [
    piece("disc", "surface", [0, 0.12, 0], [1.9, 0.24, 1.82]),
    piece("disc", "paper", [-0.35, 0.35, 0.3], [0.63, 0.29, 0.63]),
    piece("disc", "metal", [0.32, 0.49, 0.18], [0.53, 0.57, 0.53]),
    piece("disc", "accent", [-0.03, 0.53, -0.41], [0.58, 0.67, 0.58]),
  ],
];

const labScenery = [
  piece("box", "structure", [0, -0.72, 0], [14.6, 0.35, 12.25]),
  piece("box", "surface", [0, -0.29, 0], [14.9, 0.56, 12.6]),
  ...[-6.88, 6.88].map(x => piece("box", "metal", [x, -0.1, 0], [0.12, 0.19, 11.3])),
  ...[-5, -2.5, 0, 2.5, 5].map(x => piece("box", "metal", [x, 0.32, -6.08], [0.16, 0.64, 0.32])),
  piece("box", "accent", [0, 0.7, -6.08], [11.3, 0.13, 0.32]),
];
const fieldScenery = [
  piece("disc", "metal", [0, -0.85, 0], [14.3, 0.42, 12]),
  piece("disc", "surface", [0, -0.39, 0], [14.9, 0.74, 12.7]),
  piece("disc", "structure", [-2.8, -0.08, -2.4], [4.1, 0.14, 2.3], -15),
  piece("disc", "metal", [3.57, -0.072, 2.15], [4.1, 0.12, 2.75], -22),
  piece("disc", "metal", [-3, -0.071, 1.92], [5.1, 0.13, 2.25], 32),
  piece("disc", "structure", [2.9, -0.071, -2.48], [4.6, 0.1, 2.6], 8),
  piece("disc", "paper", [0.27, -0.041, -0.1], [5.4, 0.074, 4.33]),
];
const labPositions: [number, number][] = [[0, 1.15], [-4.1, -0.4], [-0.65, -4], [4.45, -2.85], [4.5, 2.7]];
const fieldPositions: [number, number][] = [[-0.6, 0.25], [-3.88, -1.55], [3.4, 0.15], [-2.78, 3.17], [2.52, -3.65]];

const technicalTerms = /\b(ai|retrieval|pipeline|sensor|algorithm|software|data|code|python|system[s]?)\b|模型|工程|数据|算法/iu;
const fieldTerms = /\b(interviews?|maps?|accessibility|community|fieldwork|wayfinding|residents?|prototype design)\b|社区|地图|访谈|田野|无障碍/iu;

export function localExhibition(brief: PortfolioBrief, layout: Layout) {
  const frame = compose(brief, layout);
  const displayed = frame.exhibits.map(exhibit => brief.entries.find(entry => entry.id === exhibit.entryId)!);
  const texts = displayed.map(entry => `${entry.title} ${entry.summary}`);
  const tech = texts.filter(text => technicalTerms.test(text)).length;
  const field = texts.filter(text => fieldTerms.test(text)).length;
  const world = field > tech ? "field" : tech > 0 ? "lab" : "gallery";
  const names = { field: ["Fieldwork Atlas", "Field Notes Trail"], lab: ["Systems Workshop", "Build Log"], gallery: ["Collected Works", "Career Walk"] };
  const showcase = layout === "showcase";
  const notes: DesignNotes = { theme: {
    entryIds: displayed.filter((_, index) => world === "field" ? fieldTerms.test(texts[index]) : world === "lab" ? technicalTerms.test(texts[index]) : true).map(entry => entry.id),
    reason: world === "field" ? "Map and fieldwork cues suggest a tabletop for exploring the approved work."
      : world === "lab" ? "Technical cues in the approved entries suggest a workshop of models and instruments."
      : "An open exhibition gives the approved work equal space without assigning a professional speciality.",
  }, exhibits: [] };
  const scene: SceneSpec = { ...frame, entrance: directionFor(displayed), theme: showcase ? (world === "field" ? "clay" : world === "lab" ? "blueprint" : "gallery") : frame.theme,
    space: { name: names[world][showcase ? 0 : 1], viewpoint: showcase ? (world === "field" ? "overhead" : "oblique") : "low",
      scenery: world === "field" ? fieldScenery : world === "lab" ? labScenery : [piece("disc", "surface", [0, -0.28, 0], [15, 0.56, 12.8])],
      connections: frame.route.slice(1).map((id, index) => [showcase ? frame.route[0] : frame.route[index], id]),
    }, exhibits: frame.exhibits.map((exhibit, index) => {
      const entry = displayed[index];
      const text = texts[index];
      const kit = fieldTerms.test(text) ? fieldObjects : technicalTerms.test(text) ? labObjects : world === "field" ? fieldObjects : labObjects;
      const motif = entry.kind === "Skill" ? 4 : entry.kind === "Experience" ? 3 : entry.kind === "Achievement" || /\b(evaluation|testing|benchmark)\b|评估|测试/iu.test(text) ? 2
        : /\b(pipeline|interviews?|retrieval|workflow)\b|工作流|访谈|检索/iu.test(text) ? 1 : 0;
      const symbols = kit === fieldObjects ? ["relief map", "cluster of markers", "waypoint", "layered field notes", "toolkit"] : ["paired rings", "linked stacks", "measuring gate", "milestone marker", "stacked toolkit"];
      notes.exhibits.push({ entryId: entry.id, reason: `A ${symbols[motif]} represents this ${entry.kind.toLowerCase()}. Select it to read the approved description.` });
      const scale = showcase && index === 0 ? 0.94 : 0.72;
      const vector = (values: Part["size"]): Part["size"] => [values[0] * scale, values[1] * scale, values[2] * scale];
      return { ...exhibit, cameraDistance: 5.1, assembly: kit[motif].map(part => ({ ...part, at: vector(part.at), size: vector(part.size) })) };
    }),
  };
  return { scene, design: notes };
}

function buildSpace(brief: PortfolioBrief, scene: SceneSpec, choices: Choice[]): SceneSpec {
  const lab = brief.author === technical.author;
  const showcase = scene.layout === "showcase";
  const positions = showcase ? (lab ? labPositions : fieldPositions) : scene.exhibits.map(exhibit => exhibit.position);
  const objects = lab ? labObjects : fieldObjects;
  const ids = scene.exhibits.map(({ id }) => id);
  const pairs = showcase
    ? (lab ? [[0, 1], [0, 2], [1, 2], [1, 3], [0, 4]] : [[0, 1], [0, 2], [0, 3], [1, 3], [2, 4]])
    : [[0, 1], [1, 2], [2, 3], [3, 4]];
  const space: SpaceSpec = {
    name: lab ? (showcase ? "Signal Lab" : "Build Log") : (showcase ? "Fieldwork Atlas" : "Field Notes Trail"),
    viewpoint: lab ? (showcase ? "oblique" : "low") : "overhead",
    scenery: lab ? labScenery : fieldScenery,
    connections: pairs.map(([a, b]) => [ids[a], ids[b]]),
  };
  return {
    ...scene, space, entrance: directionFor(brief.entries),
    exhibits: scene.exhibits.map((exhibit, slot) => ({
      ...exhibit, position: positions[slot], assembly: objects[choices[slot].index], cameraDistance: 6.2,
    })),
  };
}

function design(brief: PortfolioBrief, layout: Layout, theme: SceneSpec["theme"], cues: number[], reason: string, choices: Choice[]) {
  const frame = compose(brief, layout);
  const exhibits = choices.map(({ index, component }, slot) => {
    const entry = brief.entries[index];
    return {
      ...frame.exhibits[slot],
      entryId: entry.id, componentId: component,
      group: layout === "showcase" && !slot ? "Featured" as const : entry.kind,
    };
  });
  const notes: DesignNotes = {
    theme: { entryIds: cues.map(index => brief.entries[index].id), reason },
    exhibits: choices.map(({ index, because }) => ({ entryId: brief.entries[index].id, reason: because })),
  };
  const scene = { ...frame, theme, exhibits, route: exhibits.map(({ id }) => id) };
  return { portfolio: makePublished(brief, buildSpace(brief, scene, choices)), baseline: makePublished(brief, scene), notes };
}

export function makeDemo() {
  return Demonstration.parse({
    demo: true,
    samples: [
      {
        label: "AI tutoring",
        designs: [
          design(technicalBrief, "showcase", "blueprint", [1, 2],
            "A processing bench, loop and measuring gates let visitors go from the tutor to the systems and evaluation behind it.", [
              { index: 0, component: "plinth", because: "The paired rings suggest a response returning with supporting material. They are an illustration of the tutor, grounded in the approved project description." },
              { index: 1, component: "terminal", because: "Two processing stacks give retrieval a separate, inspectable object beside the tutor." },
              { index: 2, component: "results", because: "Place the documented evaluation behind a pair of measuring gates with its two measures in the exhibit text." },
              { index: 3, component: "marker", because: "Mark the internship separately from the technical project." },
              { index: 4, component: "skills", because: "Keep the documented tools and methods together on one rack." },
            ]),
          design(technicalBrief, "timeline", "gallery", [3, 1, 2],
            "A low-angle walk through the work starts at the internship, then traces the tutor, its implementation and evaluation.", [
              { index: 3, component: "marker", because: "Open the route with the documented internship role." },
              { index: 0, component: "panel", because: "Introduce the tutoring prototype before its implementation details." },
              { index: 1, component: "terminal", because: "Give retrieval a distinct technical stop." },
              { index: 2, component: "results", because: "End the project sequence at the documented evaluation." },
              { index: 4, component: "skills", because: "Collect the tools in a final reference stop." },
            ]),
        ],
      },
      {
        label: "Community design",
        designs: [
          design(communityBrief, "showcase", "clay", [0, 1],
            "An overhead tabletop connects the access map to the interviews, route checks, and prototype. The terrain is a schematic illustration.", [
              { index: 0, component: "plinth", because: "Raised layers and abstract pins place the map at the centre of fieldwork. The pins are symbolic." },
              { index: 1, component: "results", because: "Cluster the interview markers near the map so visitors can move between the recorded interview work and the map." },
              { index: 3, component: "panel", because: "Present the printable prototype and walkthroughs as a separate exhibit." },
              { index: 2, component: "marker", because: "Anchor the volunteer role to its stated year." },
              { index: 4, component: "skills", because: "Group the design and research methods as a toolkit." },
            ]),
          design(communityBrief, "timeline", "gallery", [2, 3],
            "Follow the field stops from the 2024 volunteer work through interviews and the 2025 print prototype to the map.", [
              { index: 2, component: "marker", because: "Start with the dated role and the route checks." },
              { index: 1, component: "results", because: "Show the field evidence before the designed artifact." },
              { index: 3, component: "marker", because: "Give the first printable prototype a dated waypoint." },
              { index: 0, component: "panel", because: "Finish the project route at the resulting access map." },
              { index: 4, component: "skills", because: "Keep the methods available as a final reference." },
            ]),
        ],
      },
    ],
  });
}
