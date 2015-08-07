# Planning Your Exploration #

Oppia models a teacher-student interaction (or, more generally, the interaction between an exploration creator and a reader) by breaking it down into _cards_. The reader's answer represents a transition between cards, and the card itself contains Oppia's feedback.

For example, the initial card of an exploration could consist of the question:

> _"Can you figure out the value of 2 + 2?"_

  * If the reader answers "4", we might transition to the completed card, which says "Correct!".

  * If the reader answers "-4", we might transition to the NegativeAnswer card, which says "You're adding two positive numbers together. Surely the answer should be positive?"

  * If the reader answers "Yes", we might transition to the SmartyPants card, which says "OK, what is 2 + 2?" (Or, better still, we would [rewrite the question to be clearer](ImprovingYourExploration.md), but that's another story.)

Note that these subsequent cards also say something, and expect an answer from the reader. This is similar to a teacher asking a question of a student, and waiting for the answer.

## Planning Your Exploration ##

Writing an Oppia exploration is a bit more involved than writing a webpage or recording a video. This is not unexpected: the former media are somewhat static, whereas one of Oppia's highlights is that it is able to respond dynamically to reader input -- and thus it needs to handle different answers for each 'card'.

The problem with writing one card that links to five cards, each of which links to five more cards, etc. is that it results in quite a bit of complexity. We recommend that you do not start by doing this. Instead, start by creating something that is, for the most part, linear. You can always add branching and loops later on. This will help you get to a 'complete' exploration as soon as possible.

Another suggestion is to spend some time planning your exploration on paper before converting it into a playable Oppia exploration, since it's easier to edit a rough pencil-and-paper draft in a way that still makes it easy to see the big picture.

We'd also encourage you to have a look at the [Design Tips](DesignTips.md) page, which contains a large list of common patterns that you can make use of when writing an exploration.


## Crafting Individual Responses ##

Writing an exploration is not as complicated as it may seem. Basically, you would be answering the following question many times:

> _If the person I'm talking to says X in response to my question Y, what should I say?_

for different possibilities of X and Y.

In other words, consider yourself to be in the position of someone who is having a 1-on-1 conversation with the reader. If the reader gives you a particular answer, how would you respond in a way that is most helpful for him or her? That is exactly what you should write for the feedback in that card.


## Further Reading ##
  * [Exploration design tips](DesignTips.md)
  * [Customizing the cards of an exploration](CustomizingStates.md)