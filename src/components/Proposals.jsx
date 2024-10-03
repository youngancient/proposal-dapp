import { Flex, Text } from "@radix-ui/themes";
import Proposal from "./Proposal";
import { useState } from "react";

const Proposals = ({ proposals }) => {
    return (
        <Flex className="w-full flex gap-4 flex-wrap p-4">
            {proposals.length === 0 ? (
                <Text>No data to display</Text>
            ) : (
                proposals.map(
                    ({
                        id,
                        deadline,
                        minRequiredVote,
                        amount,
                        description,
                        executed,
                        voteCount,
                    }, index) => (
                        <Proposal
                            key={`${deadline}${minRequiredVote}`}
                            id={id}
                            amount={amount}
                            deadline={deadline}
                            description={description}
                            executed={executed}
                            minRequiredVote={minRequiredVote}
                            voteCount={voteCount}
                        />
                    )
                )
            )}
        </Flex>
    );
};

export default Proposals;