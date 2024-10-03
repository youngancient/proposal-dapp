import { useCallback, useEffect, useState } from "react";
import useContract from "./useContract";
import { Contract, ethers } from "ethers";
import useRunners from "./useRunners";
import { Interface } from "ethers";
import ABI from "../ABI/proposal.json";

// without using Multicall
export const useAllProposals = () => {
  const [allProposals, setAllProposals] = useState([]);
  const readOnlyProposalContract = useContract();

  const fetchAllProposals = useCallback(async () => {
    if (!readOnlyProposalContract) return;
    try {
      // gets the count of proposals
      // note: the contract has a bug, if returns 1 more than the actual count of proposals
      const proposalCount = Number(
        await readOnlyProposalContract.proposalCount()
      );

      // we subtract 1 from the length
      const proposalIdArray = Array.from(
        { length: proposalCount - 1 },
        (_, i) => i + 1
      );

      const promises = proposalIdArray.map((i) =>
        readOnlyProposalContract.proposals(i)
      );
      const responses = await Promise.all(promises);

      // let data = [];

      const data = responses.map((proposalStruct) => ({
        description: proposalStruct.description,
        amount: proposalStruct.amount,
        minRequiredVote: proposalStruct.minVotesToPass,
        voteCount: proposalStruct.voteCount,
        deadline: proposalStruct.votingDeadline,
        executed: proposalStruct.executed,
      }));

      setAllProposals(data);
    } catch (error) {
      console.log("error fetching all proposals: ", error);
    }
  }, [readOnlyProposalContract]);

  useEffect(() => {
    fetchAllProposals();
  }, [fetchAllProposals]);

  return allProposals;
};

const multiCallABI = [
  "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

export const useMulticallAllProposals = () => {
  const [allProposals, setAllProposals] = useState([]);
  const readOnlyProposalContract = useContract();
  const { readOnlyProvider } = useRunners();

  const fetchAllProposals = useCallback(
    async () => {
      if (!readOnlyProposalContract) return;
      const multicallContract = new Contract(
        import.meta.env.VITE_MULTICALL_ADDRESS,
        multiCallABI,
        readOnlyProvider
      );

      // contract interface

      const iface = new Interface(ABI);

      try {
        const proposalCount = Number(
          await readOnlyProposalContract.proposalCount()
        );

        // we subtract 1 from the length
        const proposalIdArray = Array.from(
          { length: proposalCount - 1 },
          (_, i) => i + 1
        );

        const calls = proposalIdArray.map((id) => ({
          target: import.meta.env.VITE_CONTRACT_ADDRESS,
          callData: iface.encodeFunctionData("proposals", [id]),
        }));

        const responses = await multicallContract.tryAggregate.staticCall(
          true,
          calls
        );

        const decodedResults = responses.map((response) =>
          iface.decodeFunctionResult("proposals", response.returnData)
        );

        const data = decodedResults.map((proposalStruct, index) => ({
          id: proposalIdArray[index],
          description: proposalStruct.description,
          amount: proposalStruct.amount,
          minRequiredVote: proposalStruct.minVotesToPass,
          voteCount: Number(proposalStruct.voteCount),
          deadline: proposalStruct.votingDeadline,
          executed: proposalStruct.executed,
        }));

        setAllProposals(data);
      } catch (error) {
        console.log("error fetching proposals: ", error);
      }
    },
    [readOnlyProposalContract],
    readOnlyProvider
  );

  useEffect(() => {
    fetchAllProposals();
  }, [fetchAllProposals]);

  const handleCreatedProposalEvent = useCallback(
    (proposalId, description, _, amount, votingDeadline, minVotesToPass) => {
      const newProposal = {
        proposalId,
        description,
        amount,
        minRequiredVote: minVotesToPass,
        voteCount: 0,
        deadline: votingDeadline,
        executed: false,
      };
      console.log(newProposal);
      // Update the state with the new proposal, prepend it to the list
      setAllProposals((prevProposals) => [...prevProposals, newProposal]);
    },
    []
  );

  const handleVotedProposalEvent = useCallback((proposalId) => {
    console.log(proposalId);
    setAllProposals((prevProposals) =>
      prevProposals.map((proposal) => {
        console.log(proposal.id,proposalId, proposal.id === Number(proposalId))
        if (proposal.id === Number(proposalId))
          return { ...proposal, voteCount: proposal.voteCount + 1 };
        return proposal;
      })
    );
  }, []);

  useEffect(() => {
    readOnlyProposalContract.on("ProposalCreated", handleCreatedProposalEvent);

    readOnlyProposalContract.on("Voted", handleVotedProposalEvent);

    return () => {
      readOnlyProposalContract.off(
        "ProposalCreated",
        handleCreatedProposalEvent
      );
      readOnlyProposalContract.off("Voted", handleVotedProposalEvent);
    };
  }, [
    readOnlyProposalContract,
    handleCreatedProposalEvent,
    handleVotedProposalEvent,
  ]);

  return allProposals;
};
