// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract CaptureTheFlag is Ownable {

	bytes32 public whiteListRootHash;

	address public currentFlagHolder;

	event AddNewMember(address newMember, bytes32 oldRoot, bytes32 newRoot);
	
	function addMember(address newMember, address[] memory oldAddresses) public payable onlyOwner {
		bytes32 oldHash = getRootHash(oldAddresses);
		require(oldHash == whiteListRootHash, 'CaptureTheFlag: Roots do not match');
		address[] memory newAddresses = new address[](oldAddresses.length + 1);
		for (uint256 i; i < oldAddresses.length; i++) {
			newAddresses[i] = oldAddresses[i];
		}
		newAddresses[newAddresses.length - 1] = newMember;
		bytes32 newHash = getRootHash(newAddresses);
		whiteListRootHash = newHash;
		emit AddNewMember(newMember, oldHash, newHash);
	}
	
	function fillAddresses(address[] memory addresses) internal pure returns(address[] memory) {
		uint256 length = addresses.length;
		uint256 newLength = length;
		while (newLength & (newLength - 1) != 0) {
			newLength++;
		}
		address[] memory newAddresses = new address[](newLength);
		for (uint256 i; i < length; i++) {
			newAddresses[i] = addresses[i];
		}
		return newAddresses;
	}
	
	function sortAddresses(address [] memory addresses) internal pure returns (address[] memory) {
		for (uint256 i = addresses.length - 1; i > 0; i--) {
			for (uint256 j = 0; j < i; j++) {
				if (addresses [i] < addresses [j]) {
					(addresses [i], addresses [j]) = (addresses [j], addresses [i]);
				}
			}
		}
		return addresses;
	}
	
	function getLeaves(address[] memory addresses) internal pure returns(bytes32[] memory) {
		uint256 length = addresses.length;
		addresses = sortAddresses(addresses); // sorting
		bytes32[] memory leaves = new bytes32[](length);
		for (uint256 i; i < length; i++) {
			leaves[i] = keccak256(abi.encodePacked(addresses[i])); // get hash from original data
		}
		return leaves;
	}
	
	function getNodes(address[] memory addresses) internal pure returns(bytes32[] memory) {
		bytes32[] memory leaves = getLeaves(addresses);
		uint256 length = leaves.length;
		uint256 nodeCount = (length * 2) - 1; // length of all nodes
		bytes32[] memory nodes = new bytes32[](nodeCount);
		for (uint256 i = 0; i < leaves.length; i++) {
			nodes[i] = leaves[i]; // put first layer of hashes to nodes
		}
		uint256 path = length; // path equal to current layer length
		uint256 offset = 0; // needs to skip passed layer
		uint256 iteration = length;
		while (path > 0) {
			for (uint256 i = 0; i < path - 1; i += 2) {
				nodes[iteration] = keccak256(
					abi.encodePacked(nodes[offset + i], nodes[offset + i + 1])
					// get hashes on next layers, until root, last item of nodes is rootHash
				);
				iteration++;
			}
			offset += path;
			path /= 2; // get next layer length
		}
		return nodes;
	}
	
	function getRootHash(address[] memory addresses) internal pure returns(bytes32) {
		if (addresses.length == 0) {
			return bytes32(0);
		}
		bytes32[] memory nodes = getNodes(fillAddresses(addresses));
		return nodes[nodes.length - 1];
	}
	
	function sqrt(uint256 x) internal pure returns (uint256 y) {
		uint256 z = (x + 1) / 2;
		y = x;
		while (z < y) {
			y = z;
			z = (x / z + z) / 2;
		}
	}
	
	function getProof(
		address candidate,
		address[] memory addresses
	) public pure returns(bytes32[] memory proof, uint256 index) {
		address[] memory filledAddresses = fillAddresses(addresses);
		uint256 length = filledAddresses.length;
		proof = new bytes32[](sqrt(length));
		bytes32[] memory nodes = getNodes(filledAddresses);
		filledAddresses = sortAddresses(filledAddresses);
		for (uint256 i; i < length; i++) {
			if (filledAddresses[i] == candidate) {
				index = i;
				break;
			}
		}
		uint256 pathItem = index; // pathItem needs to know is item odd
		uint256 pathLayer = length; // current layer length
		uint256 offset = 0; // needs to skip passed layer
		uint256 iteration = 0;
		while (pathLayer > 1) {
			bytes32 node;
			if ((pathItem & 0x01) == 1) { // if odd
				node = nodes[offset + pathItem - 1];
			} else {
				node = nodes[offset + pathItem + 1];
			}
			proof[iteration] = node;
			iteration++;
			offset += pathLayer;
			pathLayer /= 2;
			pathItem /= 2;
		}
	}
	
	function verify(
		address candidate,
		uint256 index,
		bytes32[] calldata proof
	) public view returns(bool) {
		// get leave of current pretender value
		bytes32 node = keccak256(abi.encodePacked(candidate));
		uint256 path = index; // path needs to know is item odd
		if (proof[0] != 0) {
			for (uint16 i = 0; i < proof.length; i++) {
				// get next nodes from previous nodes until arrived root
				if ((path & 0x01) == 1) { // if odd
					node = keccak256(abi.encodePacked(proof[i], node));
				} else {
					node = keccak256(abi.encodePacked(node, proof[i]));
				}
				path /= 2;
			}
		}
		return node == whiteListRootHash;
	}

	function capture(uint256 index, bytes32[] calldata proof) public payable {
		require(verify(msg.sender, index, proof), 'CaptureTheFlag: Invalid proof');
		currentFlagHolder = msg.sender;
	}
}
