import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { formatEther } from "ethers";
import useVote from "../hooks/useVote";
import { toast } from "react-toastify";
import useExecuteProposal from "../hooks/useExecuteProposal";

// -> when i create a proposal, and i dont refresh, if i vote, it doesnt update it automatically

const Proposal = ({
  id,
  description,
  amount,
  minRequiredVote,
  voteCount,
  deadline,
  executed,
  isVoted,
  isDeadlinePassed,
}) => {
  const { isLoading, vote } = useVote();
  const { executeProposal, isExecuting } = useExecuteProposal();

  const handleProposalVoteOrExecute = () => {
    if (executed) {
      toast.error(`proposal ${id} already executed`);
      return;
    }
    if (voteCount >= minRequiredVote) {
      executeProposal(id);
      return;
    }
    if (isVoted) {
      toast.error("More votes needed to execute");
      return;
    }
    vote(id);
  };

  return (
    <Box className="bg-slate-400 rounded-md shadow-sm p-4 w-96">
      <Text className="text-2xl mb-4">Proposal {Number(id)}</Text>
      <Box className="w-full">
        <Flex className="flex gap-4">
          <Text>Description:</Text>
          <Text className="font-bold">{description}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Amount:</Text>
          <Text className="font-bold">{formatEther(amount)} ETH</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Required Vote:</Text>
          <Text className="font-bold">{Number(minRequiredVote)}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Vote Count:</Text>
          <Text className="font-bold">{Number(voteCount)}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Deadline:</Text>
          <Text className="font-bold">
            {new Date(Number(deadline) * 1000).toLocaleDateString()}
          </Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Executed:</Text>
          <Text className="font-bold">{String(executed)}</Text>
        </Flex>
      </Box>
      <Button
        className={`${
          executed
            ? "bg-gray-600"
            : voteCount < minRequiredVote && isDeadlinePassed
            ? "bg-red-600"
            : voteCount >= minRequiredVote
            ? "bg-green-700"
            : isVoted
            ? "bg-blue-900"
            : "bg-blue-600"
        } text-white font-bold w-full mt-4 p-4 rounded-md shadow-sm`}
        onClick={handleProposalVoteOrExecute}
        disabled={(voteCount < minRequiredVote && isDeadlinePassed) || executed}
      >
        {executed
          ? "Executed"
          : isExecuting
          ? "Executing"
          : voteCount < minRequiredVote && isDeadlinePassed
          ? "Expired"
          : voteCount >= minRequiredVote
          ? "Execute"
          : isVoted
          ? "Waiting"
          : isLoading
          ? "Voting..."
          : isDeadlinePassed
          ? "Waiting"
          : "Vote"}
      </Button>
    </Box>
  );
};

export default Proposal;
