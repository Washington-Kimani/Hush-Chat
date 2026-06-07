import EmojiPicker from "emoji-picker-react";

function Emoji() {
  return (
    <div className="absolute bottom-12">
      <EmojiPicker onEmojiClick={(emojiObject) => console.log(emojiObject)} />
    </div>
  );
}

export default Emoji;