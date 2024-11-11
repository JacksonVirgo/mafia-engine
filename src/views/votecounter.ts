import { type FullVoteCount } from "../models/votecounter";
import createVotecount from "../events/buttons/manageVotecount/createVotecount";
import GoHomeButton from "../events/buttons/manageVotecount/goHome";
import ManagePlayersButton from "../events/buttons/manageVotecount/gotoPlayersMenu";
import GotoStateButton from "../events/buttons/manageVotecount/gotoStateMenu";
import GotoTogglesMenu from "../events/buttons/manageVotecount/gotoToggles";
import AddPlayersButton from "../events/buttons/manageVotecount/players/addPlayers";
import RemovePlayersButton from "../events/buttons/manageVotecount/players/removePlayers";
import ReplacePlayersButton from "../events/buttons/manageVotecount/players/replacePlayer";
import ManageVoteWeight from "../events/buttons/manageVotecount/state/changeVoteWeight";
import ManageExtraVotes from "../events/buttons/manageVotecount/state/changeExtraVotes";
import JumpToDayButton from "../events/buttons/manageVotecount/state/jumpToDay";
import toggleVotable from "../events/buttons/manageVotecount/state/toggleVotable";
import {
  type BaseMessageOptions,
  EmbedBuilder,
  ActionRowBuilder,
  type ButtonBuilder,
} from "discord.js";
import { type Snowflake } from "discord.js";
import { convertDiscordTimestamp } from "../util/time";

export function genCreateVoteCountEmbed(): BaseMessageOptions {
  const embed = new EmbedBuilder();
  embed.setTitle("Create Vote-Counter");
  embed.setDescription("There is no vote counter in this channel");
  embed.setColor("Red");
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(createVotecount.build());

  return {
    embeds: [embed],
    components: [row],
  };
}

export function genVoteCountEmbed(vc: FullVoteCount): BaseMessageOptions {
  const embed = new EmbedBuilder();
  embed.setTitle("Manage Vote Counter");
  embed.setDescription("Manage the vote counter for the game");
  embed.setColor("White");

  // TOGGLES
  const isMajority = vc.majority ? "✅" : "❌";
  const isNoLynch = vc.noLynch ? "✅" : "❌";
  const isLockVotes = vc.lockVotes ? "✅" : "❌";

  let toggleStr = `Majority: ${isMajority}\nNo-Lynch: ${isNoLynch}\nLock Votes: ${isLockVotes}`;
  if (vc.majorityAfter) {
    toggleStr += `\nTimed Majority: <t:${Math.floor(
      vc.majorityAfter.getTime() / 1000
    )}:f> or <t:${Math.floor(vc.majorityAfter.getTime() / 1000)}:R>`;
  }
  embed.addFields({
    name: "Toggles",
    value: toggleStr,
    inline: true,
  });

  embed.addFields({
    name: "State",
    value: `Day ${vc.currentRound}, VC ${vc.currentIteration}`,
    inline: true,
  });

  const players =
    vc.players.length > 0
      ? vc.players
          .map(
            (p, i) =>
              `${i + 1}. ${p.user.username} ${
                p.voteWeight == 1
                  ? `${p.canBeVoted ? "" : "[cannot be voted]"}`
                  : `[x${p.voteWeight}${
                      p.canBeVoted ? "" : ", cannot be voted"
                    }]`
              }`
          )
          .join("\n")
      : "> None";
  embed.addFields({
    name: "Players",
    value: players,
    inline: false,
  });

  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    ManagePlayersButton.build(),
    GotoStateButton.build(),
    GotoTogglesMenu.build()
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

export function genStateEmbed(vc: FullVoteCount): BaseMessageOptions {
  if (!vc) return genCreateVoteCountEmbed();
  const { embeds } = genVoteCountEmbed(vc);

  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    GoHomeButton.build(),
    JumpToDayButton.build(),
    ManageVoteWeight.build(),
    ManageExtraVotes.build(),
    toggleVotable.build()
  );
  return {
    embeds,
    components: [row],
  };
}

export function genPlayersEmbed(vc: FullVoteCount): BaseMessageOptions {
  if (!vc) return genCreateVoteCountEmbed();
  const { embeds } = genVoteCountEmbed(vc);

  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    GoHomeButton.build(),
    AddPlayersButton.build(),
    RemovePlayersButton.build(),
    ReplacePlayersButton.build()
  );

  return {
    embeds,
    components: [row],
  };
}

export function genPlaceholderEmbed(vc?: FullVoteCount): BaseMessageOptions {
  if (!vc) return genCreateVoteCountEmbed();

  const embed = new EmbedBuilder();
  embed.setTitle("PLACEHOLDER");
  embed.setDescription("This menu has not been created yet");
  embed.setColor("Yellow");

  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(GoHomeButton.build());

  return {
    embeds: [embed],
    components: [row],
  };
}

export type CalculatedVoteCount = ReturnType<typeof calculateVoteCount>;
export function calculateVoteCount(vc: FullVoteCount) {
  const players = new Map<Snowflake, string>();
  const wagons = new Map<Snowflake, Snowflake[]>();
  const weights = new Map<Snowflake, number>();
  const extraVotes = new Map<Snowflake, number>();

  let votingNoLynch: Snowflake[] = [];
  let nonVoters: Snowflake[] = [];
  const cannotBeVoted: Snowflake[] = [];

  let canMajorityBeReached = vc.majority;

  vc.votes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const checkMajorityReached = () => {
    let topWagonSize = 0;

    for (const [wagon, votes] of wagons) {
      const additionalVotes = extraVotes.get(wagon);
      let totalVoteWeight = votes.reduce(
        (acc, cur) => acc + (weights.get(cur) ?? 1),
        0
      );
      if (totalVoteWeight > 0) totalVoteWeight += additionalVotes ?? 0;

      if (totalVoteWeight > topWagonSize) {
        topWagonSize = totalVoteWeight;
      }
    }

    return topWagonSize >= Math.floor(vc.players.length / 2 + 1);
  };

  for (const player of vc.players) {
    players.set(player.discordId, player.user.username);
    weights.set(player.discordId, player.voteWeight);
    extraVotes.set(player.discordId, player.additionalVotes);
    nonVoters.push(player.discordId);

    if (!player.canBeVoted) cannotBeVoted.push(player.discordId);
  }

  for (const vote of vc.votes) {
    if (vc.majorityAfter) {
      const now = new Date();
      const after = new Date(vc.majorityAfter);

      if (now > after) canMajorityBeReached = true;

      console.log(
        now.getTime(),
        after.getTime(),
        now.getTime() - after.getTime(),
        canMajorityBeReached
      );
    }

    if (canMajorityBeReached && checkMajorityReached()) continue;

    const voterId = vote.voter.discordId;
    const votedTargetId = vote.votedTarget?.discordId;
    const isNoLynch = vc.noLynch && vote.isNoLynch;
    const isUnvote = !votedTargetId && !isNoLynch;

    if (votedTargetId && !wagons.get(votedTargetId))
      wagons.set(votedTargetId, []);

    wagons.forEach((wagon, key) => {
      const exists = wagon.includes(voterId);

      const isNotVotingNL = !isNoLynch;
      const isNotVotingUnvote = !isUnvote;
      const isTarget = key == votedTargetId;
      const canBeVoted =
        vote.votedTarget?.canBeVoted === undefined
          ? true
          : vote.votedTarget.canBeVoted;
      const isFocused =
        isNotVotingNL && isNotVotingUnvote && isTarget && canBeVoted;

      if (exists && !isFocused) {
        votingNoLynch = votingNoLynch.filter((id) => id != voterId);
        wagons.set(
          key,
          wagon.filter((id) => id != voterId)
        );
      } else if (isFocused && !exists) wagons.set(key, [...wagon, voterId]);
    });

    if (isNoLynch)
      votingNoLynch = [...votingNoLynch.filter((id) => id != voterId), voterId];
    if (isUnvote) votingNoLynch = votingNoLynch.filter((id) => id != voterId);

    nonVoters = [];
    Array.from(players.keys()).forEach((player) => {
      let isVoting = false;
      wagons.forEach((wagon) => {
        if (wagon.includes(player)) isVoting = true;
      });
      if (!isVoting && !votingNoLynch.includes(player)) nonVoters.push(player);
    });
  }

  return {
    players,
    wagons,
    nonVoters,
    votingNoLynch,
    majorityReached: canMajorityBeReached && checkMajorityReached(),
    weights,
    additionalVotes: extraVotes,
    settings: {
      majority: canMajorityBeReached,
      maajorityAfter: vc.majorityAfter,
    },
    iteration: [vc.currentRound, vc.currentIteration],
    cannotBeVoted,
  };
}

export function formatVoteCount(calculated: CalculatedVoteCount) {
  const { wagons, players } = calculated;

  let format = `\`\`\`yaml\nDay ${calculated.iteration[0]} Votecount ${calculated.iteration[1]}\n\n`;

  if (calculated.majorityReached) format += "- Majority has been reached -\n\n";

  type Wagon = {
    id?: Snowflake;
    name: string;
    size: number;
    value: string;
  };
  const rawWagons: Wagon[] = [];
  let cannotBeVotedString: undefined | string;

  wagons.forEach((wagon, key) => {
    if (wagon.length > 0) {
      const wagonVoteWeight =
        wagon.reduce(
          (acc, cur) => acc + (calculated.weights.get(cur) ?? 1),
          0
        ) + (calculated.additionalVotes.get(key) ?? 0);

      const name = `${players.get(key) ?? `<@${key}>`}: `;

      const voteArray = wagon.map((id) => {
        const player = players.get(id) ?? `<@${id}>`;
        const playerVoteWeight = calculated.weights.get(id);
        let str = player;
        let modifier = "";
        if (playerVoteWeight && playerVoteWeight > 1)
          modifier += `x${playerVoteWeight} `;
        if (modifier != "") str += ` [${modifier.trim()}]`;
        return str;
      });

      rawWagons.push({
        id: key,
        name,
        size: wagonVoteWeight,
        value: voteArray.length > 0 ? voteArray.join(", ") : "None",
      });
    }
  });

  for (const [id, amount] of calculated.additionalVotes) {
    if (amount <= 0) continue;
    if (rawWagons.find((v) => v.id == id)) continue;

    rawWagons.push({
      id,
      name: `${players.get(id) ?? `<@${id}>`}: `,
      size: amount,
      value: "Nobody",
    });
  }

  if (calculated.votingNoLynch.length > 0) {
    const noLynchVoteWeight = calculated.votingNoLynch.reduce(
      (acc, cur) => acc + (calculated.weights.get(cur) ?? 1),
      0
    );
    const name = "Skipping: ";
    const value =
      calculated.votingNoLynch.length > 0
        ? calculated.votingNoLynch
            .map((id) => players.get(id) ?? `<@${id}>`)
            .join(", ")
        : "None";
    rawWagons.push({ name, size: noLynchVoteWeight, value });
  }

  if (calculated.nonVoters.length > 0) {
    const name = "Abstaining: ";
    const value = calculated.nonVoters
      .map((id) => {
        const player = players.get(id) ?? `<@${id}>`;
        const playerVoteWeight = calculated.weights.get(id);
        return `${player} ${
          playerVoteWeight && playerVoteWeight > 1
            ? `[x${playerVoteWeight}]`
            : ""
        }`;
      })
      .join(", ");

    rawWagons.push({ name, size: calculated.nonVoters.length, value });
  }

  if (calculated.cannotBeVoted.length > 0) {
    const name = "Cannot Be Voted: ";
    const value = calculated.cannotBeVoted
      .map((id) => {
        const player = players.get(id) ?? `<@${id}>`;
        return `${player}`;
      })
      .join(", ");

    cannotBeVotedString = name + value;
  }

  // Go through rawWagons and make all the first element in the array the same length, pad with spaces
  const longestWagonName = Math.max(
    ...rawWagons.map((wagon) => wagon.name.length)
  );
  const longestSizeCharacters = Math.max(
    ...rawWagons.map((wagon) => wagon.size.toString().length)
  );

  let noLynchValue: string | undefined;
  let notVotingValue: string | undefined;
  rawWagons.forEach(({ id, name, size, value }) => {
    const paddedName = name.padEnd(longestWagonName, " ");
    const paddedSize = size.toString().padStart(longestSizeCharacters, " ");
    const modifier = id ? calculated.additionalVotes.get(id) : 0;
    let parsedValue = `${paddedName} ${paddedSize}`;
    if (modifier && modifier >= 1) parsedValue += ` [+${modifier}]`;
    parsedValue += ` - ${value}`;

    if (name.includes("Skipping")) noLynchValue = parsedValue;
    else if (name.includes("Abstaining")) notVotingValue = parsedValue;
    else format += `${parsedValue}\n`;
  });

  if (noLynchValue) format += `\n${noLynchValue}`;
  if (notVotingValue) format += `\n${notVotingValue}`;
  if (noLynchValue || notVotingValue) format += "\n";
  if (cannotBeVotedString) format += `\n${cannotBeVotedString}`;

  const hasSettings = calculated.settings.majority;
  if (hasSettings) format += "\n- - - - -\n";
  if (calculated.settings.majority)
    format += `\nWith ${players.size} players, majority is ${Math.floor(
      players.size / 2 + 1
    )} votes`;
  else if (calculated.settings.maajorityAfter) {
    const time = convertDiscordTimestamp(
      Math.floor(calculated.settings.maajorityAfter.getTime() / 1000)
    );
    format += `\nWith ${players.size} players, majority of ${Math.floor(
      players.size / 2 + 1
    )} will be enabled at ${time}`;
  }
  format += "\n```";

  return format;
}
