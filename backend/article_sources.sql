begin;
alter table public.articles add column source_url text;
alter table public.articles add column content_kind text not null default 'original' check(content_kind in ('original','summary'));
alter table public.articles add column source_id text unique;
alter table public.articles drop constraint articles_category_check;
alter table public.articles add constraint articles_category_check check(length(category) between 1 and 100);
insert into public.articles(source_id,title,category,excerpt,body,published,created_at,source_url,content_kind) values
('website-chemistry','What is Chemistry?','Chemistry','An introduction to matter, atoms, bonds and chemical reactions.',
'Chemistry investigates matter and how substances change. Atoms form the starting point for understanding elements, compounds and mixtures.

An element contains one type of atom. A compound contains different elements chemically joined in fixed proportions. A mixture combines substances physically.

Matter can be solid, liquid, gas or plasma. Particle movement and arrangement help explain the differences between these states.

Chemical reactions rearrange atoms into new substances. Ionic bonding involves electron transfer, while covalent bonding involves shared electrons.

The original article also introduces the periodic table and everyday examples of chemistry.',true,'2025-12-18','https://www.bublooscientist.com/2025/12/18/what-is-chemistry/','summary'),
('website-coding','Creating new with coding','Technology','A personal update about learning Python and building a phone program.',
'The author shares progress in learning Python and describes a phone program created through coding. The post points readers to coding projects on GitHub and Replit.

The original post contains the project links. This migrated entry is a short summary rather than the original program source.',true,'2024-07-20','https://www.bublooscientist.com/2024/07/20/creating-new-with-coding/','summary'),
('website-books','Book Review: The Boy Who Spoke Dog','Book reviews','An adventure and fantasy reading recommendation.',
'This short review recommends The Boy Who Spoke Dog for readers who enjoy adventure and fantasy. It describes a stranded boy meeting a dog on an island and becoming involved in a conflict between groups of dogs.',true,'2025-04-11','https://www.bublooscientist.com/2025/04/11/book-review-the-boy-who-spoke-dog/','summary'),
('website-biology','Characteristics of living things','Biology','The seven life processes and an introduction to animal cells.',
'The article introduces seven characteristics of living things using MRS GREN: movement, respiration, sensitivity, growth, reproduction, excretion and nutrition.

It also introduces animal-cell structures, including the nucleus, cytoplasm, cell membrane and vacuoles.

This entry is an editorial summary. The full original post, including its illustrations, remains available at the source link.',true,'2024-12-12','https://www.bublooscientist.com/2024/12/12/characteristics-of-living-things/','summary')
on conflict(source_id) do nothing;
commit;
