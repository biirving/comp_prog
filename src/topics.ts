import type {Topic} from './types';
export const topics:Topic[]=[
 {id:'implementation',name:'Implementation',group:'Basics',tags:['implementation'],icon:'⌘',description:'Translate a precise idea into correct code. Boundaries, indexing, and complexity.'},
 {id:'greedy',name:'Greedy & sorting',group:'Basics',tags:['greedy','sortings'],icon:'↗',description:'Choose locally, then prove your choice preserves an optimal answer.'},
 {id:'brute',name:'Brute force & construction',group:'Basics',tags:['brute force','constructive algorithms'],icon:'⊞',description:'Enumerate carefully, exploit constraints, and construct valid answers.'},
 {id:'windows',name:'Two pointers',group:'Basics',tags:['two pointers'],icon:'↔',description:'Maintain a valid range as its boundaries move.'},
 {id:'search',name:'Binary search',group:'Basics',tags:['binary search'],icon:'⌕',description:'Identify a monotonic condition and find its exact boundary.'},
 {id:'structures',name:'Data structures',group:'Data Structures',tags:['data structures'],icon:'▤',description:'Organize data to meet the required operation costs.'},
 {id:'dsu',name:'Disjoint sets',group:'Data Structures',tags:['dsu'],icon:'⋈',description:'Merge components and answer connectivity questions efficiently.'},
 {id:'graphs',name:'Graph traversal',group:'Graph Theory',tags:['graphs','dfs and similar'],icon:'◇',description:'Model relationships and explore reachable states with DFS or BFS.'},
 {id:'trees',name:'Trees',group:'Graph Theory',tags:['trees'],icon:'⑂',description:'Reason about subtrees, paths, and information passed between nodes.'},
 {id:'paths',name:'Shortest paths',group:'Graph Theory',tags:['shortest paths'],icon:'⇢',description:'Find optimal routes and understand the assumptions of each algorithm.'},
 {id:'number',name:'Number theory',group:'Number Theory',tags:['number theory'],icon:'ℤ',description:'Divisibility, primes, modular arithmetic, and integer structure.'},
 {id:'combinatorics',name:'Combinatorics',group:'Combinatorics',tags:['combinatorics'],icon:'ⁿCₖ',description:'Count choices without double-counting. Work with large counts safely.'},
 {id:'math',name:'Mathematics',group:'Math',tags:['math'],icon:'Σ',description:'Turn observations into equations and prove why they hold.'},
 {id:'strings',name:'Strings',group:'Strings',tags:['strings','hashing','string suffix structures'],icon:'Aa',description:'Recognize and compare patterns in character sequences.'},
 {id:'dp',name:'Dynamic programming',group:'Dynamic Programming',tags:['dp'],icon:'▧',description:'Define states, transitions, base cases, and a valid evaluation order.'},
 {id:'games',name:'Game theory',group:'Game Theory',tags:['games'],icon:'♧',description:'Analyze winning positions and optimal opposing choices.'},
 {id:'geometry',name:'Geometry',group:'Geometry',tags:['geometry'],icon:'△',description:'Reason about positions, distances, intersections, and precision.'},
 {id:'bits',name:'Bit manipulation',group:'Miscellaneous',tags:['bitmasks'],icon:'01',description:'Represent sets and states with bits; exploit binary structure.'}
];
export const topicById=(id:string)=>topics.find(t=>t.id===id)!;
export const academyUrl='https://youkn0wwho.academy/topic-list';
