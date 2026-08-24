ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS occasion text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;

DELETE FROM public.questions
 WHERE id NOT IN (SELECT DISTINCT question_id FROM public.question_answers);

WITH gen AS (
  SELECT replace(f, '{t}', t) AS prompt
  FROM unnest(ARRAY['our first date','the first time we said I love you','our first trip together','the first photo we took together','the day we met','our first fight and how we made up','the first meal we cooked together','our first late-night phone call','the first gift you gave me','the first time you met my friends','the first time I made you laugh hard','our first lazy Sunday','the first song we listened to together','the first time we held hands','the first time you felt safe with me']) t
  CROSS JOIN unnest(ARRAY['What do you remember most about {t}?','What detail from {t} still makes you smile?','If you could relive {t}, what would you do differently?','What were you secretly thinking during {t}?','What would you tell your past self about {t}?']) f
  UNION
  SELECT replace(f, '{t}', t)
  FROM unnest(ARRAY['a year from now','five years from now','ten years from now','when we are old and grey','next summer','our next big adventure','the home we want','the life we are building']) t
  CROSS JOIN unnest(ARRAY['What do you hope is true for us {t}?','What is one thing you want us to have learned by {t}?','Describe an ordinary perfect day for us {t}.','What worries you a little about {t}?','What are you most excited about {t}?','What tradition do you want us to keep {t}?','What should we start doing now so {t} feels good?']) f
  UNION
  SELECT replace(f, '{t}', t)
  FROM unnest(ARRAY['my sense of humour','the way I handle stress','my cooking','how I treat my family','my ambition','the way I say sorry','my patience','my style','the way I listen','my little habits','the way I care for others','my confidence','my kindness to strangers','the way I text you','how I make plans']) t
  CROSS JOIN unnest(ARRAY['What do you appreciate about {t}?','When did {t} surprise you?','What would you tell a friend about {t}?','How has {t} changed since we met?']) f
  UNION
  SELECT replace(f, '{t}', t)
  FROM unnest(ARRAY['loved','understood','safe','missed','proud of me','closest to me','supported','free to be yourself','excited about us','calm','grateful for us','seen','wanted','at home']) t
  CROSS JOIN unnest(ARRAY['When did you last feel {t}?','What makes you feel {t} that I might not realise?','What is one small thing that helps you feel {t}?','On a hard day, what would help you feel {t}?']) f
  UNION
  SELECT replace(f, '{t}', t)
  FROM unnest(ARRAY['asking for help','saying no','being vulnerable','talking about money','arguing without shutting down','admitting I was wrong','sharing bad news','asking for more time together','talking about the future','setting boundaries with family','dealing with jealousy','being apart']) t
  CROSS JOIN unnest(ARRAY['What makes {t} hard for you?','How can I make {t} easier for you?','When did you last practise {t}?','What do you wish I understood about {t}?','What is one small step we could take on {t} this month?']) f
  UNION
  SELECT replace(f, '{t}', t)
  FROM unnest(ARRAY['a whole free weekend','a surprise day off','an unexpected windfall','a night with no phones','a road trip with no destination','a rainy day indoors','a day where we swap routines','a do-nothing day']) t
  CROSS JOIN unnest(ARRAY['How should we spend {t}?','What would you plan for us with {t}?','What is the silliest thing we could do with {t}?','Who would you invite along for {t}, if anyone?','What would make {t} unforgettable?']) f
  UNION
  SELECT replace(f, '{t}', t)
  FROM unnest(ARRAY['travel','money','family','friends','work','health','rest','celebration','conflict','communication','dreams','childhood','holidays','food','music','home life','weekends','mornings','evenings','boredom']) t
  CROSS JOIN unnest(ARRAY['What do you wish we did differently around {t}?','What is your happiest memory involving {t}?','What is your biggest hope for us around {t}?','How did your family handle {t}, and how do you want us to?','What is one rule we should make about {t}?','What stresses you about {t}?','What makes {t} fun for you?','What would a perfect version of {t} look like for us?','What do you need from me around {t}?','What is a small change to {t} that would help us?','What is something about {t} you would like to plan together?','What memory about {t} do you want to make this year?','What is the hardest part of {t} for you right now?','What is a tradition around {t} you would love to start?','Who taught you the most about {t}?']) f
  UNION
  SELECT unnest(ARRAY[
    'What was the best five minutes of your day?','What is something small I did recently that you loved?','What is on your mind that you have not said out loud yet?','What are you looking forward to this week?','What drained you today, and what refilled you?','What made you laugh today?','What do you need more of this week - rest, fun, or closeness?','What is one thing you are proud of today?','What song matches your mood right now?','What would make tomorrow feel lighter?','What is a worry you can hand to me today?','What did you notice about me today?','What is one thing you want to do together this week?','How full is your battery right now, and why?','What is the kindest thing you saw today?','What do you want to remember about today in a year?','What is something you are avoiding, and why?','What did you learn today?','What food would fix today?','What would you change about today if you could?',
    'What does love look like to you when nothing is going wrong?','What part of yourself are you still learning to accept?','What do you think I am the most afraid of?','What promise do you want us to keep forever?','What does forgiveness mean to you?','What would you want said about our relationship?','What is your definition of a good life?','What do you need to feel truly known?','What is a belief about relationships you inherited from your family?','What is a belief about relationships you want to leave behind?','When do you feel most like yourself?','What is something you have never told anyone?','What is a fear you have about us that you rarely say?','How do you know when you are happy?','What do you want to be braver about?','What does home mean to you?','What is your love language today, honestly?','What would healing look like for you?','What are you grieving quietly?','What are you hoping for that feels almost too big to say?',
    'If I were an animal, which one would I be?','What emoji describes our relationship this week?','What would our reality show be called?','If we opened a shop together, what would we sell?','What is my most predictable move?','What nickname suits me today?','Who would survive longer in a zombie apocalypse, and why?','What is the weirdest thing you love about me?','If our love had a soundtrack, what is the opening song?','What is a fashion crime you would forgive me for?','Which fictional couple are we closest to?','What is the most useless talent I have?','What snack am I?','If you could read my mind for an hour, when would you do it?','What would you name our future pet?','What is our couple superpower?','If we had a mascot, what would it be?','What is a tiny thing I do that you would miss if it stopped?','Which season of the year feels like us?','What is the funniest thing that has happened to us?',
    'What kind of affection do you crave most lately?','When do you feel most connected to me?','What makes you feel wanted?','What is something you would like more of between us?','How do you like to be comforted?','What does closeness look like on a busy day?','What helps you relax with me?','When was the last time you felt butterflies?','What is something romantic you would like to try?','What do you need after a long day - space or closeness?',
    'What is a habit you want to build this month?','What are we better at now than a year ago?','What is one thing we should stop doing as a couple?','What is a goal you want me to hold you to?','What support do you want from me this month?','What are you learning about yourself lately?','What would make you feel more balanced?','What is a boundary you want to protect?','What is a skill you want us to learn together?','What is a small routine that would help us?',
    'What are three things you are grateful for right now?','What is something about our life that you do not take for granted?','Who outside of us are you grateful for this week?','What is a small comfort you are thankful for today?','What has been the gift of this month?','What is something hard that you are now grateful for?','What do you thank me for most often in your head?','What part of your day are you always grateful for?'
  ])
), fresh AS (
  SELECT prompt FROM gen
  WHERE NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.prompt = gen.prompt)
), numbered AS (
  SELECT prompt,
         (SELECT coalesce(max(day_index), 0) FROM public.questions)
           + row_number() OVER (ORDER BY md5(prompt)) AS idx
  FROM fresh
)
INSERT INTO public.questions (day_index, prompt)
SELECT idx, prompt FROM numbered;

INSERT INTO public.questions (occasion, prompt, day_index)
SELECT v.occasion, v.prompt,
       (SELECT coalesce(max(day_index), 0) FROM public.questions) + row_number() OVER ()
FROM (VALUES
  ('01-01', 'What do you want our new year to feel like?'),
  ('01-01', 'What is one thing we should leave behind in the old year?'),
  ('01-01', 'What is your wish for us this year?'),
  ('02-14', 'What made you fall for me, and what makes you stay?'),
  ('02-14', 'What does romance mean to you right now?'),
  ('02-14', 'What is your favourite way I show you love?'),
  ('12-24', 'What is your cosiest Christmas memory?'),
  ('12-24', 'What Christmas tradition do you want us to make our own?'),
  ('12-25', 'What is the best gift you have ever been given, and why?'),
  ('12-25', 'What are you most grateful for about us this Christmas?'),
  ('12-31', 'What are you proudest of from this year?'),
  ('12-31', 'What moment from this year do you never want to forget?'),
  ('10-31', 'What costume would you pick for us as a pair?'),
  ('10-31', 'What is something that used to scare you but does not anymore?'),
  ('03-08', 'Which women shaped who you are?'),
  ('11-11', 'What did you wish for, if you can tell me?'),
  ('anniversary', 'What has surprised you most about loving me?'),
  ('anniversary', 'What is the best thing we built together this year?'),
  ('anniversary', 'If our story were a film, what would the title be?'),
  ('birthday', 'What do you want most for this next year of your life?'),
  ('birthday', 'What are you proudest of from your last year?'),
  ('birthday', 'How can I make this year of yours easier and happier?'),
  ('partner-birthday', 'What do you love most about the person born today?'),
  ('partner-birthday', 'What is your favourite memory of them from this year?')
) AS v(occasion, prompt)
WHERE NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.prompt = v.prompt);