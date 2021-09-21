import "@openzeppelin/contracts/access/Ownable.sol";

contract CaptureTheFlag is Ownable {

	bytes32 public whiteListRootHash;
	
	address public currentFlagHolder;
	
	function setWhiteListRootHash(bytes32 hash) public payable onlyOwner {
		whiteListRootHash = hash;
	}

	function capture(uint256 index, bytes32[] calldata proof) public payable {
		bytes32 node = keccak256(abi.encodePacked(index, msg.sender));
		uint256 path = index;
		for (uint16 i = 0; i < proof.length; i++) {
			if ((path & 0x01) == 1) {
				node = keccak256(abi.encodePacked(proof[i], node));
			} else {
				node = keccak256(abi.encodePacked(node, proof[i]));
			}
			path /= 2;
		}
		require(node == whiteListRootHash, 'CaptureTheFlag: Invalid proof');
		currentFlagHolder = msg.sender;
	}
}
