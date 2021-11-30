import { useState } from 'react';

export default function WsSender(props) {
  const [ value, setValue ] = useState('');

  const handleChange = e => {
    setValue(e.target.value);
  };

  const handleSubmit = e => {
    props.ws.send(value);
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        onChange={handleChange}
        value={value}
      />
      <input type="submit" value="Send" />
    </form>
  );
}
