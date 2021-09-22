import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract CaptureTheFlag is Ownable {

	bytes32 public whiteListRootHash;

	address public currentFlagHolder;

	function setWhiteListRootHash(bytes32 hash) public payable onlyOwner {
		whiteListRootHash = hash;
	}
	
	function fillWhitelist(address[] memory addresses) public view returns(address[] memory) {
		uint256 length = addresses.length;
		uint256 newLength = length;
		while (newLength & (newLength - 1) != 0) {
			newLength++;
		}
		address[] memory newAddresses = new address[](newLength);
		for (uint i; i < length; i++) {
			newAddresses[i] = addresses[i];
		}
		return newAddresses;
	}
	
	function sortAddresses (address [] memory addresses) public pure returns (address [] memory) {
		for (uint256 i = addresses.length - 1; i > 0; i--) {
			for (uint256 j = 0; j < i; j++) {
				if (addresses [i] < addresses [j]) {
					(addresses [i], addresses [j]) = (addresses [j], addresses [i]);
				}
			}
		}
		return addresses;
	}
	
	function getLeaves(address[] memory addresses) public view returns(bytes32[] memory) {
		uint256 length = addresses.length;
		addresses = sortAddresses(addresses);
		bytes32[] memory leaves = new bytes32[](length);
		for (uint256 i; i < length; i++) {
			leaves[i] = keccak256(abi.encodePacked(i, addresses[i]));
		}
		return leaves;
	}
	
	function computeRootHash(address[] memory addresses) public view returns(bytes32) {
		bytes32[] memory leaves = getLeaves(addresses);
		uint256 length = leaves.length;
		uint256 hashCount = (length * 2) - 1;
		bytes32[] memory hashes = new bytes32[](hashCount);
		for (uint i = 0; i < leaves.length; i++) {
			hashes[i] = leaves[i];
		}
		uint256 n = length;
		uint256 offset = 0;
		uint256 iteration = length;
		while (n > 0) {
			for (uint i = 0; i < n - 1; i += 2) {
				hashes[iteration] = keccak256(
					abi.encodePacked(hashes[offset + i], hashes[offset + i + 1])
				);
				iteration++;
			}
			offset += n;
			n = n / 2;
		}
		return hashes[hashes.length - 1];
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
