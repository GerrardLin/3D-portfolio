// These example lesson cards belong to the exhibit, not to the CV or the original project.
export const lessonCards = [
  {id:'S1',title:'Keyword retrieval',text:'Keyword retrieval ranks passages using shared words. An exact term or a rare name makes a useful search clue.',terms:'keyword keywords exact rare spelling name words lexical'},
  {id:'S2',title:'Semantic retrieval',text:'Semantic retrieval compares meaning. A passage can match a paraphrased question even when they share few words.',terms:'semantic meaning similar paraphrase paraphrased embeddings vector different wording'},
  {id:'S3',title:'Checking a citation',text:'A citation points to a source passage. Read the passage and check that it actually supports the answer.',terms:'citation citations cited source verify support evidence trace check reference'},
];
export const questions=['How do I find an exact name?','What if the wording is different?','How do I check a citation?'];
export function retrieveLesson(q:string){const words=new Set((q.toLowerCase().match(/[a-z]+/g)||[]).filter(w=>w.length>=3));const scored=lessonCards.map(card=>({card,score:card.terms.split(' ').filter(w=>words.has(w)).length})).sort((a,b)=>b.score-a.score);return scored[0].score?scored[0].card:null;}
