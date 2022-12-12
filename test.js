const assert = require("node:assert/strict");
const tactless = require("./tactless");

{
  const actual = tactless.pipe("a!b:0|c!d:0\n## seqn = 42\ne|f\ng|h\n");
  const expected = {
    data: [
      { a: "e", c: "f" },
      { a: "g", c: "h" },
    ],
    seqn: 42,
  };
  assert.deepStrictEqual(actual, expected);
}

{
  const actual = tactless.config("# moo\n\ncow = a bc def\npig = 1234\n\n");
  const expected = {
    data: {
      cow: ["a", "bc", "def"],
      pig: ["1234"],
    },
    name: "moo",
  };
  assert.deepStrictEqual(actual, expected);
}
